import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import {
  type Answer,
  type AskOptions,
  apiConfig,
  askReview,
  type Fetch,
  type Output,
  type ReviewBody,
} from './api';
import { findKey } from './key';
import {
  fileInside,
  filesInside,
  folderInside,
  type Inside,
  PathError,
  type Place,
  stagedFileInside,
  stagedFilesInside,
} from './paths';
import { gitRoot, projectRoot } from './project';
import { indexFiles, stagedText } from './staged';
import { formatJson, formatTable, headlineOf, type Result } from './table';

// `review.mjs`: Blue Pencil reviews of files on disk, or of what git's index holds (`--staged`), with
// the team's API key. Each document is read, sent to the review route with the spec, and its answer,
// YAML or JSON as `--output` asks, saved beside it (or under --out); what is printed is each review's
// headline and where its answer is, as a table or as JSON rows, never the reviews. Every option and
// path is checked, and the spec read, before any review, so a refused path or a broken spec costs
// nothing.

export const USAGE = [
  'Usage: node review.mjs <document|glob>... [--spec <spec.yaml|spec.json>] [--out <folder>]',
  '  [--output yaml|json] [--detail compact|full] [--outcomes fail,borderline,pass]',
  '  [--echo-spec auto|always|never] [--staged]',
].join('\n');

export const NO_KEY =
  'No Blue Pencil API key: review with the review MCP tool instead (or set BLUE_PENCIL_API_KEY; see the plugin\'s INSTALL.md).';

/** A spec file that cannot be sent: not YAML or JSON, or not a map. */
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

/** Where a document's review is saved: its path, `.review.yaml` or `.review.json` in place of its extension. */
export const savedName = (path: string, output: Output = 'yaml') =>
  `${path.replace(/\.[^./\\]*$/, '')}.review.${output}`;

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
    case 'unsupported_media_type':
      return `The server could not read the request: ${message} Update the plugin, or review with the review MCP tool.`;
    default:
      return message;
  }
}

/** The spec's text read as YAML, which reads JSON too, into the map the route takes; a SpecError when it is not one. */
function specOf(given: string, text: string): unknown {
  let spec: unknown;
  try {
    spec = parse(text);
  } catch (e) {
    const why = e instanceof Error ? (e.message.split('\n', 1)[0] ?? e.message) : String(e);
    throw new SpecError(`The spec ${given} is not YAML or JSON: ${why}`);
  }
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec))
    throw new SpecError(`The spec ${given} is not a spec: it is not a map of fields.`);
  return spec;
}

/** Where documents and the spec are read from: files on disk, or git's index (`--staged`). */
type Source = {
  file: (given: string) => Promise<Inside>;
  files: (patterns: readonly string[]) => Promise<Inside[]>;
  read: (file: Inside) => Promise<string>;
};

const disk = (place: Place): Source => ({
  file: (given) => fileInside(place, given),
  files: (patterns) => filesInside(place, patterns),
  read: (file) => readFile(file.abs, 'utf8'),
});

const index = (place: Place, entries: ReadonlySet<string>): Source => ({
  file: (given) => stagedFileInside(place, entries, given),
  files: (patterns) => stagedFilesInside(place, entries, patterns),
  read: async (file) => stagedText(place.root, file.rel),
});

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

  let source: Source;
  let place: Place;
  if (args.staged) {
    const root = gitRoot(deps.cwd);
    const entries = root === undefined ? undefined : indexFiles(root);
    if (root === undefined || entries === undefined) {
      deps.err(`--staged reads git's index, and ${deps.cwd} is not in a git repository.\n`);
      return EXIT.refused;
    }
    place = { root, cwd: deps.cwd };
    source = index(place, entries);
  } else {
    place = { root: projectRoot(deps.cwd), cwd: deps.cwd };
    source = disk(place);
  }

  const lookup = findKey(deps.env, deps.cwd);
  if (!lookup.found) {
    deps.err(`${lookup.refused?.message ?? NO_KEY}\n`);
    return EXIT.refused;
  }

  let documents: Inside[];
  let spec: unknown;
  let outDir: string | undefined;
  try {
    documents = await source.files(args.documents);
    if (args.spec !== undefined)
      spec = specOf(args.spec, await source.read(await source.file(args.spec)));
    if (args.out !== undefined) outDir = await folderInside(place, args.out);
  } catch (e) {
    if (e instanceof PathError || e instanceof SpecError) {
      deps.err(`${e.message}\n`);
      return EXIT.refused;
    }
    throw e;
  }

  const config = apiConfig(deps.env);
  const options: AskOptions = { output: args.output, query: args.query };
  const ask = (body: ReviewBody) => askReview(deps.fetch, config, lookup.key, body, options);
  const results = await eachAtMost(documents, AT_ONCE, async (doc): Promise<Result> => {
    const body: ReviewBody = {
      document: await source.read(doc),
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
      outDir === undefined
        ? savedName(doc.abs, args.output)
        : join(outDir, savedName(doc.rel, args.output));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, answer.text);
    const headline = headlineOf(answer.text);
    if (headline === undefined)
      return {
        row: { document, error: 'unreadable_answer' },
        message: `The answer has no review headline; it is saved in ${shown(deps.cwd, file)}.`,
      };
    return { row: { document, saved: shown(deps.cwd, file), ...headline } };
  });

  const footer = `key from ${lookup.source}\n`;
  if (args.output === 'json') {
    // Stdout is the JSON alone, so it pipes; where the key came from goes to stderr.
    deps.out(formatJson(results));
    deps.err(footer);
  } else {
    const notes = results.flatMap((r) => (r.message ? [`${r.row.document}: ${r.message}`] : []));
    deps.out(
      `${formatTable(results.map((r) => r.row))}${notes.length ? `\n${notes.join('\n')}\n` : ''}\n${footer}`,
    );
  }
  return results.some((r) => 'error' in r.row) ? EXIT.errored : EXIT.reviewed;
}

const OUTPUTS = ['yaml', 'json'] as const;
const DETAILS = ['compact', 'full'] as const;
const OUTCOMES = ['fail', 'borderline', 'pass'] as const;
const ECHOES = ['auto', 'always', 'never'] as const;

/** `value` when it is one of `allowed`; else an error naming the option and what it takes. */
function oneOf<T extends string>(option: string, allowed: readonly T[], value: string): T {
  const found = allowed.find((a) => a === value);
  if (found === undefined)
    throw new Error(`--${option} takes ${allowed.join(', ')}, not "${value}".`);
  return found;
}

/**
 * `--outcomes`: a comma-separated list of fail, borderline and pass, each at most once. An empty value
 * is the route's `outcomes=`, which lists no check (the headline and metrics still count them all).
 */
function outcomesOf(value: string): string {
  if (value.trim() === '') return '';
  const listed = value.split(',').map((v) => oneOf('outcomes', OUTCOMES, v.trim()));
  return [...new Set(listed)].join(',');
}

/** The command line: documents (paths or globs) and the options. Throws on a bad one. */
function parseOptions(argv: readonly string[]) {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      spec: { type: 'string' },
      out: { type: 'string' },
      output: { type: 'string', short: 'o' },
      detail: { type: 'string' },
      outcomes: { type: 'string' },
      'echo-spec': { type: 'string' },
      staged: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  // The route's query parameters, each only when given, so the route's defaults stay its own.
  const query: Record<string, string> = {};
  if (values.detail !== undefined) query.detail = oneOf('detail', DETAILS, values.detail);
  if (values.outcomes !== undefined) query.outcomes = outcomesOf(values.outcomes);
  if (values['echo-spec'] !== undefined)
    query.echo_spec = oneOf('echo-spec', ECHOES, values['echo-spec']);
  return {
    documents: positionals,
    spec: values.spec,
    out: values.out,
    output: values.output === undefined ? 'yaml' : oneOf('output', OUTPUTS, values.output),
    query,
    staged: values.staged === true,
    help: values.help === true,
  };
}
