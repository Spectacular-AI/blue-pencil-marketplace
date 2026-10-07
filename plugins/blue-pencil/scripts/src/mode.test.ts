import { afterEach, beforeEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { modeLines } from './mode';
import { gitInit, tempDir } from './test-helpers';

const KEY = 'ak_secret_mode_key';
const SCRIPT = '/plugins/blue-pencil/scripts/review.mjs';

let dir: string;
beforeEach(async () => {
  dir = await tempDir('bp-mode-');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

test('with a key: two lines, the script by its absolute path, never the key', async () => {
  await writeFile(join(dir, '.env.local'), `BLUE_PENCIL_API_KEY=${KEY}\n`);
  const text = modeLines({}, dir, SCRIPT);
  expect(text).toBe(
    [
      `Blue Pencil fast mode is on (key from .env.local): review files on disk with node "${SCRIPT}" <document>... [--spec <spec.yaml>], not the review MCP tool; each review's YAML is saved beside its document.`,
      'Never open .env or .env.local: the key in them would enter the transcript.',
      '',
    ].join('\n'),
  );
  expect(text).not.toContain(KEY);
  expect(modeLines({ BLUE_PENCIL_API_KEY: KEY }, dir, SCRIPT)).toContain('(key from environment)');
});

test('without a key: nothing', () => {
  expect(modeLines({}, dir, SCRIPT)).toBe('');
});

test('a key in a file git tracks: one line, fast mode off and why, without the key', async () => {
  await writeFile(join(dir, '.env'), `BLUE_PENCIL_API_KEY=${KEY}\n`);
  gitInit(dir, ['.env']);
  const text = modeLines({}, dir, SCRIPT);
  expect(text).toStartWith('Blue Pencil fast mode is off: The Blue Pencil API key in .env is not used');
  expect(text.trimEnd().split('\n')).toHaveLength(1);
  expect(text).not.toContain(KEY);
});

test('the entry prints the lines with review.mjs beside it, exits 0, and never prints the key', () => {
  const entry = join(import.meta.dir, 'main-mode.ts');
  const env = { PATH: process.env.PATH ?? '', HOME: dir };
  const on = spawnSync('bun', [entry], { cwd: dir, env: { ...env, BLUE_PENCIL_API_KEY: KEY }, encoding: 'utf8' });
  expect(on.status).toBe(0);
  expect(on.stdout).toContain(`node "${join(import.meta.dir, 'review.mjs')}"`);
  expect(on.stdout + on.stderr).not.toContain(KEY);
  const off = spawnSync('bun', [entry], { cwd: dir, env, encoding: 'utf8' });
  expect(off.status).toBe(0);
  expect(off.stdout + off.stderr).toBe('');
});
