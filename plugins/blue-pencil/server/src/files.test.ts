import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { filesTools } from './files';
import type { Hosted, HostedTool } from './hosted';

// The tools through their interface: a real folder on disk, and a fake hosted server that records
// each call and answers with review YAML shaped as the hosted server writes it.

const reviewYaml = (checks: number, failed: number, borderline: [number, number]) =>
  [
    `review: {pass: ${failed === 0}, checks: ${checks}, failed: ${failed}, ms: 12}`,
    'metrics:  # score; bands: sure_fail < 0.2 <= borderline <= 0.8 < sure_pass',
    `  parts: {score: 0.9, failed: ${failed}, sure_fail: 0, borderline: ${borderline[0]}, sure_pass: 1}`,
    `  meaning: {score: 0.8, failed: 0, sure_fail: 0, borderline: ${borderline[1]}, sure_pass: 1}`,
    'parts:  # by spec path',
    '  intro:',
    '    passed:',
    '      present: 0.98; found 0.98, not found 0.02',
    '',
  ].join('\n');

type Call = { tool: HostedTool; args: Record<string, string> };

let base: string;
let root: string;
let calls: Call[];
let answer: Hosted;
const hosted: Hosted = (tool, args) => {
  calls.push({ tool, args });
  return answer(tool, args);
};

beforeEach(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), 'bp-files-')));
  root = join(base, 'round');
  await mkdir(join(root, 'good'), { recursive: true });
  await mkdir(join(root, 'spec'));
  await writeFile(join(root, 'good', 'a.md'), '# A\n\nText a.\n');
  await writeFile(join(root, 'good', 'b.md'), '# B\n\nText b.\n');
  await writeFile(join(root, 'spec', 'note.yaml'), 'title: Note\n');
  await writeFile(join(base, 'secret.md'), '# Secret\n');
  calls = [];
  answer = async (_tool, args) => ({
    text: args.document?.startsWith('# A')
      ? reviewYaml(5, 1, [1, 2])
      : reviewYaml(4, 0, [0, 0]),
    isError: false,
  });
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

const texts = (r: { content: { text: string }[] }) => r.content.map((c) => c.text);

/** The calls sorted by the document they sent. */
const byDocument = (list: Call[]) =>
  [...list].sort((a, b) =>
    (a.args.document ?? '').localeCompare(b.args.document ?? ''),
  );

describe('review_files', () => {
  test('reviews each file a glob matches, with its text, and returns each answer unchanged, then the table', async () => {
    const result = await filesTools(root, hosted).reviewFiles({
      spec: 'spec/note.yaml',
      documents: ['good/*.md'],
      format: 'markdown',
    });
    // Reviews run three at a time, so the calls come in any order; the answers keep the files' order.
    expect(byDocument(calls)).toEqual([
      {
        tool: 'review',
        args: { document: '# A\n\nText a.\n', format: 'markdown', spec: 'title: Note\n' },
      },
      {
        tool: 'review',
        args: { document: '# B\n\nText b.\n', format: 'markdown', spec: 'title: Note\n' },
      },
    ]);
    expect(result.isError).toBeUndefined();
    expect(texts(result)).toEqual([
      `# good/a.md\n${reviewYaml(5, 1, [1, 2])}`,
      `# good/b.md\n${reviewYaml(4, 0, [0, 0])}`,
      [
        '| document | pass | checks | failed | borderline |',
        '|---|---|---|---|---|',
        '| good/a.md | false | 5 | 1 | 3 |',
        '| good/b.md | true | 4 | 0 | 0 |',
        '| all 2 | 1 passed | 9 | 1 | 3 |',
        '',
      ].join('\n'),
    ]);
  });

  test('sends no spec when none is named, and each file once however many patterns name it', async () => {
    await filesTools(root, hosted).reviewFiles({
      documents: ['good/a.md', 'good/*.md', join(root, 'good', 'a.md')],
      format: 'markdown',
    });
    expect(byDocument(calls).map((c) => c.args)).toEqual([
      { document: '# A\n\nText a.\n', format: 'markdown' },
      { document: '# B\n\nText b.\n', format: 'markdown' },
    ]);
  });

  test.each([
    ['a relative path', '../secret.md'],
    ['an absolute path', '/etc/hosts'],
    ['a glob', '../*.md'],
    ['an absolute glob', `${'/'}etc/*`],
  ])('refuses %s outside the folder, before any review', async (_, path) => {
    const result = await filesTools(root, hosted).reviewFiles({
      documents: ['good/a.md', path],
      format: 'markdown',
    });
    expect(result.isError).toBe(true);
    expect(texts(result)[0]).toContain('is outside the folder this server reads');
    expect(calls).toEqual([]);
  });

  test('refuses a link inside the folder that leads outside it', async () => {
    await symlink(join(base, 'secret.md'), join(root, 'good', 'link.md'));
    const direct = await filesTools(root, hosted).reviewFiles({
      documents: ['good/link.md'],
      format: 'markdown',
    });
    const globbed = await filesTools(root, hosted).reviewFiles({
      documents: ['good/*.md'],
      format: 'markdown',
    });
    expect(direct.isError).toBe(true);
    expect(globbed.isError).toBe(true);
    expect(calls).toEqual([]);
  });

  test('refuses a spec or a save folder outside the folder', async () => {
    const tools = filesTools(root, hosted);
    const spec = await tools.reviewFiles({
      spec: '../secret.md',
      documents: ['good/a.md'],
      format: 'markdown',
    });
    const saved = await tools.reviewFiles({
      documents: ['good/a.md'],
      format: 'markdown',
      save_to: '../reviews',
    });
    expect([spec.isError, saved.isError]).toEqual([true, true]);
    expect(calls).toEqual([]);
  });

  test('says which path is missing, and which glob matches nothing', async () => {
    const tools = filesTools(root, hosted);
    const missing = await tools.reviewFiles({ documents: ['good/c.md'], format: 'markdown' });
    const none = await tools.reviewFiles({ documents: ['bad/*.md'], format: 'markdown' });
    expect(texts(missing)).toEqual([`No file at "good/c.md" in ${root}.`]);
    expect(texts(none)).toEqual([`No file matches "bad/*.md" in ${root}.`]);
    expect(calls).toEqual([]);
  });

  test('saves each answer and the table in the save folder', async () => {
    await filesTools(root, hosted).reviewFiles({
      spec: 'spec/note.yaml',
      documents: ['good/*.md'],
      format: 'markdown',
      save_to: 'reviews/pass-1',
    });
    const saved = (p: string) => readFile(join(root, 'reviews', 'pass-1', p), 'utf8');
    expect(await saved('good/a.review.yaml')).toBe(reviewYaml(5, 1, [1, 2]));
    expect(await saved('good/b.review.yaml')).toBe(reviewYaml(4, 0, [0, 0]));
    expect(await saved('table.md')).toContain('| all 2 | 1 passed | 9 | 1 | 3 |');
  });

  test("passes a review's error through, and sets the error flag only when every review failed", async () => {
    const error = 'error: {code: spec_invalid, message: "Not a spec.", path: title}\n';
    answer = async (_tool, args) =>
      args.document?.startsWith('# A')
        ? { text: error, isError: true }
        : { text: reviewYaml(4, 0, [0, 0]), isError: false };
    const some = await filesTools(root, hosted).reviewFiles({
      documents: ['good/*.md'],
      format: 'markdown',
    });
    expect(some.isError).toBeUndefined();
    expect(texts(some)[0]).toBe(`# good/a.md\n${error}`);
    expect(texts(some)[2]).toContain('| good/a.md | error: spec_invalid | | | |');
    expect(texts(some)[2]).toContain('| all 2 | 1 passed, 1 error | 4 | 0 | 0 |');

    answer = async () => {
      throw new Error('fetch failed');
    };
    const none = await filesTools(root, hosted).reviewFiles({
      documents: ['good/a.md'],
      format: 'markdown',
    });
    expect(none.isError).toBe(true);
    expect(texts(none)[0]).toBe('# good/a.md\nThe Blue Pencil server did not answer: fetch failed');
  });
});

describe('check_spec_file', () => {
  test("sends the file's text and returns the answer unchanged, with its error flag", async () => {
    answer = async () => ({ text: 'title: Note\n', isError: false });
    const ok = await filesTools(root, hosted).checkSpecFile({ spec: 'spec/note.yaml' });
    expect(calls).toEqual([{ tool: 'check_spec', args: { spec: 'title: Note\n' } }]);
    expect(ok).toEqual({ content: [{ type: 'text', text: 'title: Note\n' }] });

    answer = async () => ({ text: 'error: {code: spec_invalid}\n', isError: true });
    const bad = await filesTools(root, hosted).checkSpecFile({ spec: 'spec/note.yaml' });
    expect(bad.isError).toBe(true);
    expect(texts(bad)).toEqual(['error: {code: spec_invalid}\n']);
  });

  test('refuses a spec outside the folder', async () => {
    const result = await filesTools(root, hosted).checkSpecFile({ spec: '../secret.md' });
    expect(result.isError).toBe(true);
    expect(calls).toEqual([]);
  });
});
