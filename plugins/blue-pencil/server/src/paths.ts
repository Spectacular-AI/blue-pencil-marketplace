import { mkdir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { glob, isDynamicPattern } from 'tinyglobby';

// Every path a tool takes is resolved inside one folder, the root: the working directory the server
// started in. A path, a glob or a link that leads outside it is refused, so a worker whose file tools
// are held to its folder cannot read outside it through this server either.

/** A path the tools refuse, with a message that says why. */
export class PathError extends Error {}

/** A file inside the root: its real path, and its path from the root as the answers name it. */
export type Inside = { abs: string; rel: string };

const posix = (p: string) => p.split(sep).join('/');

/** Whether `p` is inside `root` (the root itself only when `orRoot`). Both absolute. */
function within(root: string, p: string, orRoot = false): boolean {
  const rel = relative(root, p);
  if (rel === '') return orRoot;
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

const outside = (given: string, root: string) =>
  new PathError(
    `"${given}" is outside the folder this server reads, ${root}. Give a path inside it.`,
  );

/** The file at `given`, relative to the root or absolute, when it is a file inside the root. */
export async function fileInside(root: string, given: string): Promise<Inside> {
  const abs = resolve(root, given);
  let real: string;
  try {
    real = await realpath(abs);
  } catch {
    if (!within(root, abs)) throw outside(given, root);
    throw new PathError(`No file at "${given}" in ${root}.`);
  }
  if (!within(root, real)) throw outside(given, root);
  if (!(await stat(real)).isFile())
    throw new PathError(`"${given}" is a folder, not a file.`);
  return { abs: real, rel: posix(relative(root, real)) };
}

/**
 * The files the patterns name, in the patterns' order, each glob's matches sorted, each file once. A
 * pattern without glob characters is one path; a glob that matches nothing is refused, as is any
 * pattern that reaches outside the root.
 */
export async function filesInside(
  root: string,
  patterns: readonly string[],
): Promise<Inside[]> {
  const found = new Map<string, Inside>();
  for (const pattern of patterns) {
    const files: Inside[] = [];
    if (!isDynamicPattern(pattern)) files.push(await fileInside(root, pattern));
    else {
      const local = posix(
        isAbsolute(pattern) ? relative(root, pattern) : pattern,
      );
      if (local.split('/').includes('..')) throw outside(pattern, root);
      const matches = await glob(local, {
        cwd: root,
        onlyFiles: true,
        expandDirectories: false,
      });
      if (matches.length === 0)
        throw new PathError(`No file matches "${pattern}" in ${root}.`);
      for (const match of matches.sort())
        files.push(await fileInside(root, match));
    }
    for (const file of files)
      if (!found.has(file.abs)) found.set(file.abs, file);
  }
  return [...found.values()];
}

/** The folder at `given`, made if it is not there, when it is the root or inside it. */
export async function folderInside(root: string, given: string): Promise<string> {
  const abs = resolve(root, given);
  if (!within(root, abs, true)) throw outside(given, root);
  await mkdir(abs, { recursive: true });
  const real = await realpath(abs);
  if (!within(root, real, true)) throw outside(given, root);
  return real;
}
