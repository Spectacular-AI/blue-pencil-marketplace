import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findKey, readEnvVar } from './key';
import { gitInit, tempDir } from './test-helpers';

describe('readEnvVar', () => {
  test.each([
    ['a plain line', 'BLUE_PENCIL_API_KEY=ak_plain', 'ak_plain'],
    ['export and spaces around =', 'export BLUE_PENCIL_API_KEY = ak_export', 'ak_export'],
    ['double quotes', 'BLUE_PENCIL_API_KEY="ak_double # not a comment"', 'ak_double # not a comment'],
    ['single quotes', "BLUE_PENCIL_API_KEY='ak_single'", 'ak_single'],
    ['a comment after the value', 'BLUE_PENCIL_API_KEY=ak_comment # the team key', 'ak_comment'],
    ['CRLF line ends', 'OTHER=1\r\nBLUE_PENCIL_API_KEY=ak_crlf\r\nMORE=2\r\n', 'ak_crlf'],
    ['comment lines and blank lines', '# BLUE_PENCIL_API_KEY=ak_commented\n\nBLUE_PENCIL_API_KEY=ak_real\n', 'ak_real'],
    ['the later of two lines', 'BLUE_PENCIL_API_KEY=ak_first\nBLUE_PENCIL_API_KEY=ak_second', 'ak_second'],
  ])('reads %s', (_, text, key) => {
    expect(readEnvVar(text, 'BLUE_PENCIL_API_KEY')).toBe(key);
  });

  test.each([
    ['another variable only', 'OPENAI_API_KEY=sk_x\nBLUE_PENCIL_API_KEY_OLD=ak_old'],
    ['an empty value', 'BLUE_PENCIL_API_KEY='],
    ['empty quotes', 'BLUE_PENCIL_API_KEY=""'],
    ['a commented-out line', '#BLUE_PENCIL_API_KEY=ak_off'],
  ])('reads nothing from %s', (_, text) => {
    expect(readEnvVar(text, 'BLUE_PENCIL_API_KEY')).toBeUndefined();
  });
});

describe('findKey', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await tempDir('bp-key-');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('the environment wins over both files', async () => {
    await writeFile(join(dir, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_local\n');
    await writeFile(join(dir, '.env'), 'BLUE_PENCIL_API_KEY=ak_env\n');
    expect(findKey({ BLUE_PENCIL_API_KEY: ' ak_environment ' }, dir)).toEqual({
      found: true,
      key: 'ak_environment',
      source: 'environment',
    });
  });

  test('.env.local wins over .env; .env is read when it is alone', async () => {
    await writeFile(join(dir, '.env'), 'BLUE_PENCIL_API_KEY=ak_env\n');
    expect(findKey({}, dir)).toEqual({ found: true, key: 'ak_env', source: '.env' });
    await writeFile(join(dir, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_local\n');
    expect(findKey({ BLUE_PENCIL_API_KEY: '' }, dir)).toEqual({
      found: true,
      key: 'ak_local',
      source: '.env.local',
    });
  });

  test('a .env.local without the key leaves the lookup to .env', async () => {
    await writeFile(join(dir, '.env.local'), 'OTHER=1\n');
    await writeFile(join(dir, '.env'), 'BLUE_PENCIL_API_KEY=ak_env\n');
    expect(findKey({}, dir)).toEqual({ found: true, key: 'ak_env', source: '.env' });
  });

  test('no key anywhere is not found, with nothing refused', () => {
    expect(findKey({}, dir)).toEqual({ found: false });
  });

  test("looks in the working directory, then the repository's root", async () => {
    gitInit(dir);
    const sub = join(dir, 'docs');
    await mkdir(sub);
    await writeFile(join(dir, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_root\n');
    expect(findKey({}, sub)).toEqual({ found: true, key: 'ak_root', source: '.env.local' });
    await writeFile(join(sub, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_sub\n');
    expect(findKey({}, sub)).toEqual({ found: true, key: 'ak_sub', source: '.env.local' });
  });

  test("a .env.local at the root wins over a .env in the working directory", async () => {
    gitInit(dir);
    const sub = join(dir, 'docs');
    await mkdir(sub);
    await writeFile(join(sub, '.env'), 'BLUE_PENCIL_API_KEY=ak_sub_env\n');
    await writeFile(join(dir, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_root_local\n');
    expect(findKey({}, sub)).toEqual({
      found: true,
      key: 'ak_root_local',
      source: '.env.local',
    });
  });

  test('refuses a key in a file git tracks, naming the file, and never returns the key', async () => {
    await writeFile(join(dir, '.env'), 'BLUE_PENCIL_API_KEY=ak_tracked_secret\n');
    gitInit(dir, ['.env']);
    const lookup = findKey({}, dir);
    expect(lookup.found).toBe(false);
    expect(lookup.found === false && lookup.refused?.file).toBe('.env');
    expect(lookup.found === false && lookup.refused?.message).toContain('Move it to .env.local');
    expect(JSON.stringify(lookup)).not.toContain('ak_tracked_secret');
  });

  test('a tracked file without the key is no refusal', async () => {
    await writeFile(join(dir, '.env'), 'PUBLIC=1\n');
    await writeFile(join(dir, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_local\n');
    gitInit(dir, ['.env']);
    expect(findKey({}, dir)).toEqual({ found: true, key: 'ak_local', source: '.env.local' });
  });

  test('an untracked key file in a repository is used', async () => {
    gitInit(dir);
    await writeFile(join(dir, '.env.local'), 'BLUE_PENCIL_API_KEY=ak_local\n');
    expect(findKey({}, dir)).toEqual({ found: true, key: 'ak_local', source: '.env.local' });
  });
});
