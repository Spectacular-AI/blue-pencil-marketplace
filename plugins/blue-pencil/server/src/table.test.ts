import { expect, test } from 'bun:test';
import { formatTable, rowOf } from './table';

test("a review's row is its headline's counts and its metrics' unsure checks summed", () => {
  const yaml = [
    'review: {pass: false, checks: 23, failed: 5, ms: 1840}',
    'metrics:  # score; bands: sure_fail < 0.2 <= unsure <= 0.8 < sure_pass',
    '  parts: {score: 0.74, failed: 2, sure_fail: 2, unsure: 0, sure_pass: 6}',
    '  meaning: {score: 0.61, failed: 1, sure_fail: 0, unsure: 2, sure_pass: 2}',
    '  tone: {score: 0.71, failed: 1, sure_fail: 1, unsure: 1, sure_pass: 1}',
    'parts:  # by spec path',
    '  whole_document:  # the whole document',
    '    failed:',
    '      asserts.must_say.0: "0.31; not stated 0.69, stated 0.31"',
    '',
  ].join('\n');
  expect(rowOf('good/a.md', yaml, false)).toEqual({
    document: 'good/a.md',
    pass: false,
    checks: 23,
    failed: 5,
    unsure: 3,
  });
});

test('a review with no checks has no metrics', () => {
  const yaml = 'review: {pass: true, checks: 0, failed: 0, ms: 3}\nmetrics: {}\nparts: {}\n';
  expect(rowOf('a.md', yaml, false)).toEqual({
    document: 'a.md',
    pass: true,
    checks: 0,
    failed: 0,
    unsure: 0,
  });
});

test("an error's row is its code; an answer with no headline is unreadable", () => {
  expect(
    rowOf('a.md', 'error: {code: document_too_large, message: "Too long.", limit: 100, estimate: 200}\n', true),
  ).toEqual({ document: 'a.md', error: 'document_too_large' });
  expect(rowOf('a.md', 'Input validation error: format', true)).toEqual({
    document: 'a.md',
    error: 'error',
  });
  expect(rowOf('a.md', 'not: [yaml', false)).toEqual({
    document: 'a.md',
    error: 'unreadable answer',
  });
});

test('one row has no line for all; several do, errors counted apart', () => {
  const one = formatTable([{ document: 'a.md', pass: true, checks: 4, failed: 0, unsure: 1 }]);
  expect(one).toBe(
    '| document | pass | checks | failed | unsure |\n|---|---|---|---|---|\n| a.md | true | 4 | 0 | 1 |\n',
  );
  const several = formatTable([
    { document: 'a.md', pass: true, checks: 4, failed: 0, unsure: 1 },
    { document: 'b.md', pass: false, checks: 6, failed: 2, unsure: 2 },
    { document: 'c.md', error: 'review_failed' },
  ]);
  expect(several.trimEnd().split('\n').slice(-2)).toEqual([
    '| c.md | error: review_failed | | | |',
    '| all 3 | 1 passed, 1 error | 10 | 2 | 3 |',
  ]);
});
