import { mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import picomatch from 'picomatch';
import { escapePath, glob, isDynamicPattern } from 'tinyglobby';

// Every path the review script takes is resolved from the working directory and must stay inside one
// folder, the project root (the git repository's root, else the working directory). A path, a glob or
// a link that leads outside it is refused before any review, so the script reads and writes nothing
// outside the project.

/** A path the script refuses, with a message that says why. */
export class PathError extends Error {}

/** A file inside the root: its real path, and its path from the root, with `/` between folders. */
export type Inside = { abs: string; rel: string };

const toPosix = (p: string) => p.split(sep).join('/');

/** Whether `p` is inside `root` (the root itself only when `orRoot`). Both absolute. */
function within(root: string, p: string, orRoot = false): boolean {
  const rel = relative(root, p);
  if (rel === '') return orRoot;
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

const outside = (given: string, root: string) =>
  new PathError(
    `"${given}" is outside the project folder, ${root}. Give a path inside it.`,
  );

/** Where the script works: the project root and the working directory inside it, both real paths. */
export type Place = { root: string; cwd: string };

/** The file at `given`, from the working directory or absolute, when it is a file inside the root. */
export async function fileInside({ root, cwd }: Place, given: string): Promise<Inside> {
  const abs = resolve(cwd, given);
  let real: string;
  try {
    real = await realpath(abs);
  } catch {
    if (!within(root, abs)) throw outside(given, root);
    throw new PathError(`No file at "${given}".`);
  }
  if (!within(root, real)) throw outside(given, root);
  if (!(await stat(real)).isFile())
    throw new PathError(`"${given}" is a folder, not a file.`);
  return { abs: real, rel: toPosix(relative(root, real)) };
}

/**
 * A glob from the working directory as a glob from the root, or undefined when it reaches outside it.
 * The working directory's own path is escaped, so a folder named `[draft]` is not read as a pattern.
 */
function globFromRoot({ root, cwd }: Place, pattern: string): string | undefined {
  const local = isAbsolute(pattern)
    ? toPosix(relative(root, pattern))
    : posix.join(escapePath(toPosix(relative(root, cwd))), toPosix(pattern));
  const normal = posix.normalize(local);
  if (normal === '..' || normal.startsWith('../') || posix.isAbsolute(normal)) return undefined;
  return normal;
}

/**
 * The files the patterns name, in the patterns' order, each glob's matches sorted, each file once. A
 * pattern without glob characters is one path; a glob that matches nothing is refused, as is any
 * pattern that reaches outside the root.
 */
export async function filesInside(
  place: Place,
  patterns: readonly string[],
): Promise<Inside[]> {
  const found = new Map<string, Inside>();
  for (const pattern of patterns) {
    const files: Inside[] = [];
    if (!isDynamicPattern(pattern)) files.push(await fileInside(place, pattern));
    else {
      const fromRoot = globFromRoot(place, pattern);
      if (fromRoot === undefined) throw outside(pattern, place.root);
      const matches = await glob(fromRoot, {
        cwd: place.root,
        onlyFiles: true,
        expandDirectories: false,
        absolute: true,
      });
      if (matches.length === 0) throw new PathError(`No file matches "${pattern}".`);
      for (const match of matches.sort())
        files.push(await fileInside({ root: place.root, cwd: place.root }, match));
    }
    for (const file of files) if (!found.has(file.abs)) found.set(file.abs, file);
  }
  return [...found.values()];
}

/** The folder at `given`, made if it is not there, when it is the root or inside it. */
export async function folderInside({ root, cwd }: Place, given: string): Promise<string> {
  const abs = resolve(cwd, given);
  if (!within(root, abs, true)) throw outside(given, root);
  await mkdir(abs, { recursive: true });
  const real = await realpath(abs);
  if (!within(root, real, true)) throw outside(given, root);
  return real;
}

/**
 * The path's real place on disk, through the nearest folder above it that exists, so a folder that is
 * not there yet (a file only the index holds) is placed where its parent's links lead.
 */
async function realPlace(abs: string): Promise<string> {
  let dir = abs;
  const below: string[] = [];
  for (;;) {
    try {
      return join(await realpath(dir), ...below);
    } catch {
      const up = dirname(dir);
      if (up === dir) return abs;
      below.unshift(relative(up, dir));
      dir = up;
    }
  }
}

/**
 * The staged file at `given` (`--staged`): a path from the working directory or absolute, inside the
 * root, that git's index holds (`index`, paths from the root). Its `abs` is where it is in the working
 * tree, where its review is saved, refused when a link on disk leads that place outside the root.
 */
export async function stagedFileInside(
  place: Place,
  index: ReadonlySet<string>,
  given: string,
): Promise<Inside> {
  const abs = resolve(place.cwd, given);
  if (!within(place.root, abs)) throw outside(given, place.root);
  const rel = toPosix(relative(place.root, abs));
  if (!index.has(rel))
    throw new PathError(
      `"${given}" is not in git's index: stage it with git add, or review it without --staged.`,
    );
  if (!within(place.root, await realPlace(abs))) throw outside(given, place.root);
  return { abs, rel };
}

/**
 * The staged files the patterns name (`--staged`), as `filesInside` names files on disk: a pattern
 * without glob characters is one path the index must hold; a glob is matched against the index's
 * paths, its matches sorted, and refused when it matches none.
 */
export async function stagedFilesInside(
  place: Place,
  index: ReadonlySet<string>,
  patterns: readonly string[],
): Promise<Inside[]> {
  const found = new Map<string, Inside>();
  for (const pattern of patterns) {
    const files: Inside[] = [];
    if (!isDynamicPattern(pattern)) files.push(await stagedFileInside(place, index, pattern));
    else {
      const fromRoot = globFromRoot(place, pattern);
      if (fromRoot === undefined) throw outside(pattern, place.root);
      const isMatch = picomatch(fromRoot);
      const matches = [...index].filter((rel) => isMatch(rel)).sort();
      if (matches.length === 0) throw new PathError(`No staged file matches "${pattern}".`);
      for (const rel of matches)
        files.push(await stagedFileInside({ root: place.root, cwd: place.root }, index, rel));
    }
    for (const file of files) if (!found.has(file.rel)) found.set(file.rel, file);
  }
  return [...found.values()];
}
