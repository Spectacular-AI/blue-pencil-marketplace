import { expect, test } from 'bun:test';
import { formatTable, headlineOf } from './table';
import { reviewYaml } from './test-helpers';

test("a review's headline is read from its YAML, borderline among it", () => {
  expect(headlineOf(reviewYaml(23, 5, 2, 0.71))).toEqual({
    pass: false,
    score: 0.71,
    checks: 23,
    failed: 5,
    borderline: 2,
  });
});

test('a review with no checks', () => {
  const yaml = 'review: {pass: true, score: 1, checks: 0, failed: 0, borderline: 0, passed: 0, ms: 3}\nmetrics: {}\nparts: {}\n';
  expect(headlineOf(yaml)).toEqual({ pass: true, score: 1, checks: 0, failed: 0, borderline: 0 });
});

test('text that is not YAML, an error, or a headline without its counts is no headline', () => {
  expect(headlineOf('not: [yaml')).toBeUndefined();
  expect(headlineOf('error: {code: review_failed, message: "x"}\n')).toBeUndefined();
  expect(headlineOf('review: {pass: true, checks: 3, failed: 0, ms: 3}\n')).toBeUndefined();
});

test('one row and the line for all', () => {
  expect(
    formatTable([
      { document: 'a.md', saved: 'a.review.yaml', pass: true, score: 0.9, checks: 4, failed: 0, borderline: 1 },
    ]),
  ).toBe(
    [
      '| document | pass | score | checks | failed | borderline | review |',
      '|---|---|---|---|---|---|---|',
      '| a.md | true | 0.9 | 4 | 0 | 1 | a.review.yaml |',
      '| all 1 | 1 passed | | 4 | 0 | 1 | |',
      '',
    ].join('\n'),
  );
});

test('several rows, errors counted apart, scores at two decimals', () => {
  const table = formatTable([
    { document: 'a.md', saved: 'a.review.yaml', pass: true, score: 0.912, checks: 4, failed: 0, borderline: 1 },
    { document: 'b.md', saved: 'b.review.yaml', pass: false, score: 0.5, checks: 6, failed: 2, borderline: 2 },
    { document: 'c.md', error: 'review_failed' },
  ]);
  expect(table.trimEnd().split('\n').slice(2)).toEqual([
    '| a.md | true | 0.91 | 4 | 0 | 1 | a.review.yaml |',
    '| b.md | false | 0.5 | 6 | 2 | 2 | b.review.yaml |',
    '| c.md | error: review_failed | | | | | |',
    '| all 3 | 1 passed, 1 error | | 10 | 2 | 3 | |',
  ]);
});
