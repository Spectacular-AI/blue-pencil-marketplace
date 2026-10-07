import { execFileSync } from 'node:child_process';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// What the tests share: a temporary folder (a real path), a git repository made in one, and review
// YAML shaped as the route writes it.

export const tempDir = async (prefix: string) =>
  realpath(await mkdtemp(join(tmpdir(), prefix)));

/** Makes `dir` a git repository, and stages `files` in it, so git tracks them. */
export function gitInit(dir: string, files: readonly string[] = []) {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  if (files.length) execFileSync('git', ['add', '--', ...files], { cwd: dir });
}

/** A review's YAML, its headline as the route writes it, with a part below it. */
export const reviewYaml = (checks: number, failed: number, borderline: number, score = 0.8) =>
  [
    `review: {pass: ${failed === 0}, score: ${score}, checks: ${checks}, failed: ${failed}, borderline: ${borderline}, passed: ${checks - failed - borderline}, ms: 12}`,
    'strictness: {level: standard, fail: 0.4, pass: 0.8}  # each check fails below 0.4, passes above 0.8, and is borderline from 0.4 to 0.8',
    'metrics:  # score; then how many checks failed, were borderline and passed',
    `  parts: {score: ${score}, failed: ${failed}, borderline: ${borderline}, passed: 1}`,
    'parts:  # by spec path; its checks under failed, borderline and passed',
    '  intro:',
    '    passed:',
    '      present: "0.98; found 0.98, not found 0.02"',
    '',
  ].join('\n');

/** The same review as JSON, the route's answer to `Accept: application/json`. */
export const reviewJson = (checks: number, failed: number, borderline: number, score = 0.8) =>
  JSON.stringify({
    review: { pass: failed === 0, score, checks, failed, borderline, passed: checks - failed - borderline, ms: 12 },
    strictness: { level: 'standard', fail: 0.4, pass: 0.8 },
    metrics: { parts: { score, failed, borderline, passed: 1 } },
    parts: { intro: { passed: { present: { value: 0.98, asked: [{ found: 0.98, 'not found': 0.02 }] } } } },
  });
