import { parse } from 'yaml';
import { z } from 'zod';

// The table after the reviews: per document, what its review's YAML says, read from its headline
// (`review: {pass, checks, failed}`) and its metrics' `borderline` counts, which the server bands
// itself (borderline: 0.2 to 0.8, both included).
// Nothing is judged here.

/** One document's line: its counts, or the error its review answered with. */
export type Row =
  | {
      document: string;
      pass: boolean;
      checks: number;
      failed: number;
      borderline: number;
    }
  | { document: string; error: string };

/** What the table reads of a review's YAML; everything else in it is left alone. */
const Answer = z.object({
  review: z
    .object({
      pass: z.boolean(),
      checks: z.number().int(),
      failed: z.number().int(),
    })
    .optional(),
  metrics: z
    .record(
      z.string(),
      z.object({ borderline: z.number().int() }).partial(),
    )
    .optional(),
  error: z.object({ code: z.string() }).partial().optional(),
});

/** The YAML text read, or undefined when it is not YAML. */
function yamlOf(text: string): unknown {
  try {
    return parse(text);
  } catch {
    return undefined;
  }
}

/** The row for one review's answer; `isError` is the hosted tool's error flag. */
export function rowOf(document: string, text: string, isError: boolean): Row {
  const read = Answer.safeParse(yamlOf(text));
  const answer = read.success ? read.data : undefined;
  if (isError || answer?.error)
    return { document, error: answer?.error?.code ?? 'error' };
  if (!answer?.review) return { document, error: 'unreadable answer' };
  const { pass, checks, failed } = answer.review;
  let borderline = 0;
  for (const metric of Object.values(answer.metrics ?? {}))
    borderline += metric.borderline ?? 0;
  return { document, pass, checks, failed, borderline };
}

/** The rows as a markdown table, with a line for all of them when there are several. */
export function formatTable(rows: readonly Row[]): string {
  const lines = [
    '| document | pass | checks | failed | borderline |',
    '|---|---|---|---|---|',
    ...rows.map((r) =>
      'error' in r
        ? `| ${r.document} | error: ${r.error} | | | |`
        : `| ${r.document} | ${r.pass} | ${r.checks} | ${r.failed} | ${r.borderline} |`,
    ),
  ];
  if (rows.length > 1) {
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
      `| all ${rows.length} | ${passCell} | ${sums.checks} | ${sums.failed} | ${sums.borderline} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}
