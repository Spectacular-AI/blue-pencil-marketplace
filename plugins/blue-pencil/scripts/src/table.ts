import { parse } from 'yaml';

// The table the review script prints: per document, what its review's YAML says in its headline,
// `review: {pass, score, checks, failed, borderline, passed, ms}`, and where the YAML was saved; or the
// error its review answered with. Nothing else of a review is printed, and nothing is judged here.

/** A review's headline counts. */
export type Headline = {
  pass: boolean;
  score: number;
  checks: number;
  failed: number;
  borderline: number;
};

/** One document's line: its headline and the saved YAML's path, or the code of its error. */
export type Row =
  | ({ document: string; saved: string } & Headline)
  | { document: string; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** The headline of a review's YAML, or undefined when the text is not a review's answer. */
export function headlineOf(text: string): Headline | undefined {
  let read: unknown;
  try {
    read = parse(text);
  } catch {
    return undefined;
  }
  const review = isRecord(read) ? read.review : undefined;
  if (!isRecord(review)) return undefined;
  const { pass, score, checks, failed, borderline } = review;
  if (typeof pass !== 'boolean' || typeof score !== 'number') return undefined;
  if (!isCount(checks) || !isCount(failed) || !isCount(borderline)) return undefined;
  return { pass, score, checks, failed, borderline };
}

/** A score as its review writes it: two decimals at most. */
const num = (n: number) => String(Math.round(n * 100) / 100);

/** The rows as a markdown table, ending with a line for all of them. */
export function formatTable(rows: readonly Row[]): string {
  const lines = [
    '| document | pass | score | checks | failed | borderline | review |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) =>
      'error' in r
        ? `| ${r.document} | error: ${r.error} | | | | | |`
        : `| ${r.document} | ${r.pass} | ${num(r.score)} | ${r.checks} | ${r.failed} | ${r.borderline} | ${r.saved} |`,
    ),
  ];
  let passed = 0;
  let errors = 0;
  const sums = { checks: 0, failed: 0, borderline: 0 };
  for (const r of rows) {
    if ('error' in r) {
      errors += 1;
      continue;
    }
    if (r.pass) passed += 1;
    sums.checks += r.checks;
    sums.failed += r.failed;
    sums.borderline += r.borderline;
  }
  const passCell = `${passed} passed${errors ? `, ${errors} error` : ''}`;
  lines.push(
    `| all ${rows.length} | ${passCell} | | ${sums.checks} | ${sums.failed} | ${sums.borderline} | |`,
  );
  return `${lines.join('\n')}\n`;
}
