import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { filesInside, folderInside, type Place } from './paths';
import { tempDir } from './test-helpers';

// The project folder is `base/project`; `base/secret.md` is outside it.

let base: string;
let root: string;
let place: Place;

beforeEach(async () => {
  base = await tempDir('bp-paths-');
  root = join(base, 'project');
  await mkdir(join(root, 'good'), { recursive: true });
  await mkdir(join(root, '[draft]'));
  await writeFile(join(root, 'good', 'a.md'), '# A\n');
  await writeFile(join(root, 'good', 'b.md'), '# B\n');
  await writeFile(join(root, '[draft]', 'c.md'), '# C\n');
  await writeFile(join(base, 'secret.md'), '# Secret\n');
  place = { root, cwd: root };
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

const rels = (files: { rel: string }[]) => files.map((f) => f.rel);

describe('filesInside', () => {
  test('a glob matches sorted, and a file named twice is read once', async () => {
    expect(rels(await filesInside(place, ['good/b.md', 'good/*.md']))).toEqual([
      'good/b.md',
      'good/a.md',
    ]);
  });

  test('paths and globs are read from the working directory, inside the root', async () => {
    const sub = { root, cwd: join(root, 'good') };
    expect(rels(await filesInside(sub, ['a.md', '../good/b.md']))).toEqual([
      'good/a.md',
      'good/b.md',
    ]);
    expect(rels(await filesInside(sub, ['*.md']))).toEqual(['good/a.md', 'good/b.md']);
    expect(rels(await filesInside(sub, ['../*/*.md']))).toEqual([
      '[draft]/c.md',
      'good/a.md',
      'good/b.md',
    ]);
  });

  test("a working directory whose name looks like a glob is not read as one", async () => {
    const draft = { root, cwd: join(root, '[draft]') };
    expect(rels(await filesInside(draft, ['*.md']))).toEqual(['[draft]/c.md']);
  });

  test.each([
    ['a relative path', '../secret.md'],
    ['an absolute path', '/etc/hosts'],
    ['a glob', '../*.md'],
    ['an absolute glob', '/etc/*'],
    ['a glob that climbs out through ..', 'good/../../*.md'],
  ])('refuses %s outside the project', async (_, path) => {
    await expect(filesInside(place, ['good/a.md', path])).rejects.toThrow('is outside the project folder');
  });

  test('refuses a link inside the project that leads outside it, named or globbed', async () => {
    await symlink(join(base, 'secret.md'), join(root, 'good', 'link.md'));
    await expect(filesInside(place, ['good/link.md'])).rejects.toThrow('is outside the project folder');
    await expect(filesInside(place, ['good/*.md'])).rejects.toThrow('is outside the project folder');
  });

  test('says which path is missing, which glob matches nothing, and which is a folder', async () => {
    await expect(filesInside(place, ['good/c.md'])).rejects.toThrow('No file at "good/c.md".');
    await expect(filesInside(place, ['bad/*.md'])).rejects.toThrow('No file matches "bad/*.md".');
    await expect(filesInside(place, ['good'])).rejects.toThrow('"good" is a folder, not a file.');
  });
});

describe('folderInside', () => {
  test('makes a folder inside the project, and refuses one outside it', async () => {
    expect(await folderInside(place, 'reviews/pass-1')).toBe(join(root, 'reviews', 'pass-1'));
    await expect(folderInside(place, '../reviews')).rejects.toThrow('is outside the project folder');
  });
});
