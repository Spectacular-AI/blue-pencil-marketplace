import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Hosted, ToolAnswer } from './hosted';
import { filesInside, fileInside, folderInside, PathError } from './paths';
import { formatTable, type Row, rowOf } from './table';

// The two tools, over files: read the files inside the root, call the hosted tool with their text,
// and return its answers unchanged. The only thing added is the table after `review_files`' reviews,
// read from their YAML. Every path is checked before any hosted call, so a refused path costs nothing.

/** A tool's result as MCP sends it. */
export type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

export type ReviewFilesInput = {
  /** The spec's YAML file; without one, each document is reviewed against a spec from its headings. */
  spec?: string;
  /** Paths or globs of the documents. */
  documents: string[];
  /** The documents' format, passed on as the hosted `review` takes it. */
  format: string;
  /** A folder to write each review's YAML and the table to, as each review returns. */
  save_to?: string;
};

export type CheckSpecFileInput = { spec: string };

/** How many reviews run at once: 26 of 47 sent together timed out; three at a time, none did. */
const AT_ONCE = 3;

const text = (t: string) => ({ type: 'text' as const, text: t });
const refused = (message: string): ToolResult => ({
  content: [text(message)],
  isError: true,
});

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

/** A hosted call's answer, or what went wrong reaching it, as an answer with the error flag. */
async function ask(
  hosted: Hosted,
  tool: 'review' | 'check_spec',
  args: Record<string, string>,
): Promise<ToolAnswer> {
  try {
    return await hosted(tool, args);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { text: `The Blue Pencil server did not answer: ${why}`, isError: true };
  }
}

/** Where a document's review is saved: its path from the root, `.review.yaml` in place of its extension. */
const savedName = (rel: string) => `${rel.replace(/\.[^./]*$/, '')}.review.yaml`;

/**
 * The tools over the files inside `root`, calling `hosted` for every answer. `root` is a real path
 * (no link in it), which the caller resolves once.
 */
export function filesTools(root: string, hosted: Hosted) {
  return {
    /**
     * Each document reviewed against the spec file: per document, `# <path>` and then its review's
     * YAML as the hosted `review` answered it; last, the table. The error flag is set when a path is
     * refused (before any review) or when every review answered with an error.
     */
    async reviewFiles(input: ReviewFilesInput): Promise<ToolResult> {
      let documents: Awaited<ReturnType<typeof filesInside>>;
      let spec: string | undefined;
      let saveTo: string | undefined;
      try {
        documents = await filesInside(root, input.documents);
        if (input.spec !== undefined)
          spec = await readFile((await fileInside(root, input.spec)).abs, 'utf8');
        if (input.save_to !== undefined)
          saveTo = await folderInside(root, input.save_to);
      } catch (e) {
        if (e instanceof PathError) return refused(e.message);
        throw e;
      }
      const save = async (rel: string, body: string) => {
        if (saveTo === undefined) return;
        const file = join(saveTo, rel);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, body);
      };
      const reviews = await eachAtMost(documents, AT_ONCE, async (doc) => {
        const document = await readFile(doc.abs, 'utf8');
        const args: Record<string, string> = { document, format: input.format };
        if (spec !== undefined) args.spec = spec;
        const answer = await ask(hosted, 'review', args);
        await save(savedName(doc.rel), answer.text);
        return { rel: doc.rel, answer };
      });
      const rows: Row[] = reviews.map(({ rel, answer }) =>
        rowOf(rel, answer.text, answer.isError),
      );
      const table = formatTable(rows);
      await save('table.md', table);
      return {
        content: [
          ...reviews.map(({ rel, answer }) => text(`# ${rel}\n${answer.text}`)),
          text(table),
        ],
        ...(reviews.every((r) => r.answer.isError) ? { isError: true } : {}),
      };
    },

    /** The spec file checked by the hosted `check_spec`: its answer, unchanged. */
    async checkSpecFile(input: CheckSpecFileInput): Promise<ToolResult> {
      let spec: string;
      try {
        spec = await readFile((await fileInside(root, input.spec)).abs, 'utf8');
      } catch (e) {
        if (e instanceof PathError) return refused(e.message);
        throw e;
      }
      const answer = await ask(hosted, 'check_spec', { spec });
      return {
        content: [text(answer.text)],
        ...(answer.isError ? { isError: true } : {}),
      };
    },
  };
}
