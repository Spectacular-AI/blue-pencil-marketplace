import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import { type Answer, apiConfig, askReview, type Fetch, type ReviewBody } from './api';
import { findKey } from './key';
import { fileInside, filesInside, folderInside, PathError, type Place } from './paths';
import { projectRoot } from './project';
import { formatTable, headlineOf, type Row } from './table';

// `review.mjs`: Blue Pencil reviews of files on disk, with the team's API key. Each document is read,
// sent to the review route with the spec, and its YAML answer saved beside it (or under --out); what
// is printed is a table of each review's headline and where its YAML is, never the reviews. Every
// path is checked, and the spec read, before any review, so a refused path or a broken spec costs
// nothing.

export const USAGE =
  'Usage: node review.mjs <document|glob>... [--spec <spec.yaml>] [--out <folder>]';

export const NO_KEY =
  'No Blue Pencil API key: review with the review MCP tool instead (or set BLUE_PENCIL_API_KEY; see the plugin\'s INSTALL.md).';

/** A spec file that cannot be sent: not YAML, or not a map. */
export class SpecError extends Error {}

/** How many reviews run at once: 26 of 47 sent together timed out; three at a time, none did. */
const AT_ONCE = 3;

/** How long to wait before the one retry of a review that was rate limited. */
export const RATE_LIMIT_WAIT_MS = 10_000;

/** What the script reads from its surroundings; a test passes its own. */
export type Deps = {
  env: Record<string, string | undefined>;
  cwd: string;
  fetch: Fetch;
  sleep: (ms: number) => Promise<void>;
  out: (text: string) => void;
  err: (text: string) => void;
};

/** The exit codes: every document reviewed; one or more errored; nothing reviewed (key, paths, arguments). */
export const EXIT = { reviewed: 0, errored: 1, refused: 2 } as const;

/** Runs `run` on each item, `limit` at a time, keeping the items' order in the results. */
async function eachAtMost<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  // One iterator shared by the workers: each takes the next item when it is free.
  const queue = items.entries();
  const worker = async () => {
    for (const [i, item] of queue) results[i] = await run(item);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Where a document's review is saved: its path, `.review.yaml` in place of its extension. */
export const savedName = (path: string) => `${path.replace(/\.[^./\\]*$/, '')}.review.yaml`;

/** A path as the table shows it: from the working directory, with `/` between folders. */
const shown = (cwd: string, abs: string) => relative(cwd, abs).split(sep).join('/');

/** The message an error's row is explained by, in the words of what the key lacks. */
function explain(code: string, message: string): string {
  switch (code) {
    case 'plan_required':
      return `The key's team plan does not allow this: ${message}`;
    case 'scope_required':
      return `The key does not have the review scope: ${message} Make a key with it at https://slop-or-not.ai/keys.`;
    case 'rate_limited':
      return `${message} (Retried once, after ${RATE_LIMIT_WAIT_MS / 1000} seconds.)`;
    default:
      return message;
  }
}

/** The spec file read as YAML into the object the route takes; a SpecError when it is not one. */
async function readSpec(place: Place, given: string): Promise<unknown> {
  const file = await fileInside(place, given);
  const text = await readFile(file.abs, 'utf8');
  let spec: unknown;
  try {
    spec = parse(text);
  } catch (e) {
    const why = e instanceof Error ? (e.message.split('\n', 1)[0] ?? e.message) : String(e);
    throw new SpecError(`The spec ${given} is not YAML: ${why}`);
  }
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec))
    throw new SpecError(`The spec ${given} is not a spec: its YAML is not a map of fields.`);
  return spec;
}

/** The script, from its arguments to its exit code. */
export async function review(argv: readonly string[], deps: Deps): Promise<number> {
  let args: ReturnType<typeof parseOptions>;
  try {
    args = parseOptions(argv);
  } catch (e) {
    deps.err(`${e instanceof Error ? e.message : String(e)}\n${USAGE}\n`);
    return EXIT.refused;
  }
  if (args.help) {
    deps.out(`${USAGE}\n`);
    return EXIT.reviewed;
  }
  if (args.documents.length === 0) {
    deps.err(`Name at least one document.\n${USAGE}\n`);
    return EXIT.refused;
  }

  const lookup = findKey(deps.env, deps.cwd);
  if (!lookup.found) {
    deps.err(`${lookup.refused?.message ?? NO_KEY}\n`);
    return EXIT.refused;
  }

  const place: Place = { root: projectRoot(deps.cwd), cwd: deps.cwd };
  let documents: Awaited<ReturnType<typeof filesInside>>;
  let spec: unknown;
  let outDir: string | undefined;
  try {
    documents = await filesInside(place, args.documents);
    if (args.spec !== undefined) spec = await readSpec(place, args.spec);
    if (args.out !== undefined) outDir = await folderInside(place, args.out);
  } catch (e) {
    if (e instanceof PathError || e instanceof SpecError) {
      deps.err(`${e.message}\n`);
      return EXIT.refused;
    }
    throw e;
  }

  const config = apiConfig(deps.env);
  const ask = (body: ReviewBody) => askReview(deps.fetch, config, lookup.key, body);
  const results = await eachAtMost(documents, AT_ONCE, async (doc) => {
    const body: ReviewBody = {
      document: await readFile(doc.abs, 'utf8'),
      format: 'markdown',
      ...(spec === undefined ? {} : { spec }),
    };
    let answer: Answer = await ask(body);
    if ('code' in answer && answer.code === 'rate_limited') {
      await deps.sleep(RATE_LIMIT_WAIT_MS);
      answer = await ask(body);
    }
    const document = shown(deps.cwd, doc.abs);
    if ('code' in answer)
      return { row: { document, error: answer.code }, message: explain(answer.code, answer.message) };
    const file =
      outDir === undefined ? savedName(doc.abs) : join(outDir, savedName(doc.rel));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, answer.yaml);
    const headline = headlineOf(answer.yaml);
    if (headline === undefined)
      return {
        row: { document, error: 'unreadable_answer' },
        message: `The answer has no review headline; it is saved in ${shown(deps.cwd, file)}.`,
      };
    return { row: { document, saved: shown(deps.cwd, file), ...headline } };
  });

  const rows: Row[] = results.map((r) => r.row);
  const notes = results.flatMap((r) =>
    'message' in r && r.message ? [`${r.row.document}: ${r.message}`] : [],
  );
  deps.out(
    `${formatTable(rows)}${notes.length ? `\n${notes.join('\n')}\n` : ''}\nkey from ${lookup.source}\n`,
  );
  return rows.some((r) => 'error' in r) ? EXIT.errored : EXIT.reviewed;
}

/** The command line: documents (paths or globs), `--spec`, `--out`, `--help`. Throws on a bad one. */
function parseOptions(argv: readonly string[]) {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      spec: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  return {
    documents: positionals,
    spec: values.spec,
    out: values.out,
    help: values.help === true,
  };
}
