import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PRODUCTION_URL } from './api';
import { type Deps, NO_KEY, RATE_LIMIT_WAIT_MS, review } from './review';
import { gitInit, reviewYaml, tempDir } from './test-helpers';

// The script through its interface: a real project folder on disk (`base/project`, with
// `base/secret.md` outside it), and a fake fetch that records each request and answers as the route
// does. The real server is never called.

const KEY = 'ak_secret_test_key';

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

let base: string;
let root: string;
let calls: Call[];
let slept: number[];
let stdout: string;
let stderr: string;
let respond: (call: Call) => Response | Promise<Response>;

const yamlResponse = (text: string) =>
  new Response(text, { headers: { 'content-type': 'application/yaml; charset=utf-8' } });
const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

const deps = (over: Partial<Deps> = {}): Deps => ({
  env: { BLUE_PENCIL_API_KEY: KEY },
  cwd: root,
  fetch: async (url, init) => {
    const call: Call = {
      url,
      headers: Object.fromEntries(new Headers(init.headers)),
      body: JSON.parse(String(init.body)),
    };
    calls.push(call);
    return respond(call);
  },
  sleep: async (ms) => {
    slept.push(ms);
  },
  out: (t) => {
    stdout += t;
  },
  err: (t) => {
    stderr += t;
  },
  ...over,
});

const run = (argv: string[], over?: Partial<Deps>) => review(argv, deps(over));

beforeEach(async () => {
  base = await tempDir('bp-review-');
  root = join(base, 'project');
  await mkdir(join(root, 'good'), { recursive: true });
  await mkdir(join(root, 'spec'));
  await writeFile(join(root, 'good', 'a.md'), '# A\n\nText a.\n');
  await writeFile(join(root, 'good', 'b.md'), '# B\n\nText b.\n');
  await writeFile(join(root, 'spec', 'note.yaml'), 'title: Note\nparts:\n  intro: {required: true}\n');
  await writeFile(join(root, 'spec', 'broken.yaml'), 'title: [Note\n');
  await writeFile(join(base, 'secret.md'), '# Secret\n');
  calls = [];
  slept = [];
  stdout = '';
  stderr = '';
  respond = ({ body }) =>
    yamlResponse(
      String(body.document).startsWith('# A') ? reviewYaml(5, 1, 2, 0.71) : reviewYaml(4, 0, 0, 0.95),
    );
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

/** The calls sorted by the document they sent: three run at once, in any order. */
const byDocument = (list: Call[]) =>
  [...list].sort((a, b) => String(a.body.document).localeCompare(String(b.body.document)));

describe('a review', () => {
  test('sends each document with the spec as an object, asks for YAML, and sends nothing else', async () => {
    expect(await run(['good/*.md', '--spec', 'spec/note.yaml'])).toBe(0);
    const spec = { title: 'Note', parts: { intro: { required: true } } };
    expect(byDocument(calls).map((c) => c.body)).toEqual([
      { document: '# A\n\nText a.\n', format: 'markdown', spec },
      { document: '# B\n\nText b.\n', format: 'markdown', spec },
    ]);
    for (const call of calls) {
      expect(call.url).toBe(`${PRODUCTION_URL}/api/review`);
      expect(call.headers).toEqual({
        authorization: `Bearer ${KEY}`,
        accept: 'application/yaml',
        'content-type': 'application/json',
      });
    }
  });

  test('sends no spec without --spec, each document once, to BLUE_PENCIL_URL with the bypass', async () => {
    const env = {
      BLUE_PENCIL_API_KEY: KEY,
      BLUE_PENCIL_URL: 'http://localhost:3009',
      BLUE_PENCIL_BYPASS: 'bypass',
    };
    expect(await run(['good/a.md', 'good/*.md'], { env })).toBe(0);
    expect(byDocument(calls).map((c) => c.body)).toEqual([
      { document: '# A\n\nText a.\n', format: 'markdown' },
      { document: '# B\n\nText b.\n', format: 'markdown' },
    ]);
    expect(calls[0]?.url).toBe('http://localhost:3009/api/review');
    expect(calls[0]?.headers['x-vercel-protection-bypass']).toBe('bypass');
  });

  test("saves each answer beside its document, and prints only the table and the key's source", async () => {
    expect(await run(['good/*.md'])).toBe(0);
    expect(await readFile(join(root, 'good', 'a.review.yaml'), 'utf8')).toBe(reviewYaml(5, 1, 2, 0.71));
    expect(await readFile(join(root, 'good', 'b.review.yaml'), 'utf8')).toBe(reviewYaml(4, 0, 0, 0.95));
    expect(stdout).toBe(
      [
        '| document | pass | score | checks | failed | borderline | review |',
        '|---|---|---|---|---|---|---|',
        '| good/a.md | false | 0.71 | 5 | 1 | 2 | good/a.review.yaml |',
        '| good/b.md | true | 0.95 | 4 | 0 | 0 | good/b.review.yaml |',
        '| all 2 | 1 passed | | 9 | 1 | 2 | |',
        '',
        'key from environment',
        '',
      ].join('\n'),
    );
    expect(stderr).toBe('');
  });

  test('saves under --out keeping the path from the project root, shown from the working directory', async () => {
    gitInit(root);
    expect(await run(['a.md', '--out', '../reviews/pass-1'], { cwd: join(root, 'good') })).toBe(0);
    const saved = join(root, 'reviews', 'pass-1', 'good', 'a.review.yaml');
    expect(await readFile(saved, 'utf8')).toBe(reviewYaml(5, 1, 2, 0.71));
    expect(stdout).toContain('| a.md | false | 0.71 | 5 | 1 | 2 | ../reviews/pass-1/good/a.review.yaml |');
    await expect(stat(join(root, 'good', 'a.review.yaml'))).rejects.toThrow();
  });

  test('the key from .env.local is named in the footer, and never printed', async () => {
    await writeFile(join(root, '.env.local'), `BLUE_PENCIL_API_KEY=${KEY}\n`);
    expect(await run(['good/a.md'], { env: {} })).toBe(0);
    expect(calls[0]?.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(stdout.trimEnd().split('\n').at(-1)).toBe('key from .env.local');
    expect(stdout + stderr).not.toContain(KEY);
  });
});

describe('refused before any review, exit 2', () => {
  test('no key: the message to use the MCP tool', async () => {
    expect(await run(['good/a.md'], { env: {} })).toBe(2);
    expect(stderr).toBe(`${NO_KEY}\n`);
    expect(calls).toEqual([]);
  });

  test('a key in a file git tracks: the file named, the key not used or printed', async () => {
    await writeFile(join(root, '.env'), `BLUE_PENCIL_API_KEY=${KEY}\n`);
    gitInit(root, ['.env']);
    expect(await run(['good/a.md'], { env: {} })).toBe(2);
    expect(stderr).toContain('The Blue Pencil API key in .env is not used: git tracks that file');
    expect(stdout + stderr).not.toContain(KEY);
    expect(calls).toEqual([]);
  });

  test.each([
    ['a document outside', ['good/a.md', '../secret.md']],
    ['a glob outside', ['../*.md']],
    ['a spec outside', ['good/a.md', '--spec', '../secret.md']],
    ['an --out outside', ['good/a.md', '--out', '../reviews']],
  ])('%s', async (_, argv) => {
    expect(await run(argv)).toBe(2);
    expect(stderr).toContain('is outside the project folder');
    expect(calls).toEqual([]);
  });

  test('the project is the git repository: a path outside the working directory but inside it is read', async () => {
    gitInit(root);
    expect(await run(['../good/b.md'], { cwd: join(root, 'spec') })).toBe(0);
    expect(calls).toHaveLength(1);
  });

  test('a spec that is not YAML, named', async () => {
    expect(await run(['good/a.md', '--spec', 'spec/broken.yaml'])).toBe(2);
    expect(stderr).toStartWith('The spec spec/broken.yaml is not YAML: ');
    expect(calls).toEqual([]);
  });

  test('a spec that is YAML but not a map', async () => {
    await writeFile(join(root, 'spec', 'list.yaml'), '- a\n- b\n');
    expect(await run(['good/a.md', '--spec', 'spec/list.yaml'])).toBe(2);
    expect(stderr).toContain('is not a spec');
    expect(calls).toEqual([]);
  });

  test('no document, or an unknown option: the usage', async () => {
    expect(await run([])).toBe(2);
    expect(stderr).toContain('Usage: node review.mjs');
    stderr = '';
    expect(await run(['good/a.md', '--strict'])).toBe(2);
    expect(stderr).toContain('Usage: node review.mjs');
    expect(calls).toEqual([]);
  });
});

describe('errors, a row each, exit 1', () => {
  const SCOPE = 'This API key does not have the review scope this route needs. Use a key that has it.';
  test.each([
    ['unauthorized', 401, 'The API key is not valid.', 'The API key is not valid.'],
    ['plan_required', 403, 'API keys need a team on Enterprise.', "The key's team plan does not allow this: API keys need a team on Enterprise."],
    ['scope_required', 403, SCOPE, `The key does not have the review scope: ${SCOPE}`],
    ['request_invalid', 400, 'Bad.', 'Bad.'],
    ['document_too_large', 413, 'Too long.', 'Too long.'],
    ['spec_invalid', 422, 'Not a spec.', 'Not a spec.'],
    ['review_failed', 502, 'Failed.', 'Failed.'],
  ])('%s', async (code, status, sent, shown) => {
    respond = ({ body }) =>
      String(body.document).startsWith('# A')
        ? errorResponse(status, code, sent)
        : yamlResponse(reviewYaml(4, 0, 0, 0.95));
    expect(await run(['good/*.md'])).toBe(1);
    expect(stdout).toContain(`| good/a.md | error: ${code} | | | | | |`);
    expect(stdout).toContain('| all 2 | 1 passed, 1 error | | 4 | 0 | 0 | |');
    expect(stdout).toContain(`good/a.md: ${shown}`);
    expect(slept).toEqual([]);
  });

  test('rate_limited waits 10 seconds and retries that document once', async () => {
    let tries = 0;
    respond = () => {
      tries += 1;
      return tries === 1
        ? errorResponse(429, 'rate_limited', 'Too many requests.')
        : yamlResponse(reviewYaml(4, 0, 0, 0.95));
    };
    expect(await run(['good/b.md'])).toBe(0);
    expect(slept).toEqual([RATE_LIMIT_WAIT_MS]);
    expect(RATE_LIMIT_WAIT_MS).toBe(10_000);
    expect(calls).toHaveLength(2);
    expect(stdout).toContain('| good/b.md | true | 0.95 |');
  });

  test('rate_limited twice is an error row, after one retry', async () => {
    respond = () => errorResponse(429, 'rate_limited', 'Too many requests.');
    expect(await run(['good/b.md'])).toBe(1);
    expect(calls).toHaveLength(2);
    expect(slept).toEqual([RATE_LIMIT_WAIT_MS]);
    expect(stdout).toContain('| good/b.md | error: rate_limited |');
    expect(stdout).toContain('good/b.md: Too many requests. (Retried once, after 10 seconds.)');
  });

  test("a JSON 200 is an older server's: an error row, nothing saved", async () => {
    respond = () => Response.json({ summary: { pass: true } });
    expect(await run(['good/a.md'])).toBe(1);
    expect(stdout).toContain('| good/a.md | error: old_server |');
    expect(stdout).toContain('good/a.md: The server does not answer YAML yet');
    await expect(stat(join(root, 'good', 'a.review.yaml'))).rejects.toThrow();
  });

  test('a server that does not answer: no_answer, with the reason', async () => {
    const fetch = async () => {
      throw new TypeError('fetch failed');
    };
    expect(await run(['good/a.md'], { fetch })).toBe(1);
    expect(stdout).toContain('| good/a.md | error: no_answer |');
    expect(stdout).toContain('good/a.md: The Blue Pencil server did not answer: fetch failed');
  });

  test('a YAML answer without a headline is saved, and its row says so', async () => {
    respond = () => yamlResponse('something: else\n');
    expect(await run(['good/a.md'])).toBe(1);
    expect(await readFile(join(root, 'good', 'a.review.yaml'), 'utf8')).toBe('something: else\n');
    expect(stdout).toContain('| good/a.md | error: unreadable_answer |');
  });
});
