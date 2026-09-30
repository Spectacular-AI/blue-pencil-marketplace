import { realpathSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { filesTools } from './files';
import { hostedConfig, hostedServer } from './hosted';

// The `blue-pencil-files` stdio server: Blue Pencil's `review` and `check_spec` over files on disk,
// so an agent never writes a document into a tool call. It reads files only inside the working
// directory it starts in, and every answer is the hosted server's (./hosted.ts).

const root = realpathSync(process.cwd());
const tools = filesTools(root, hostedServer(hostedConfig(process.env)));

const WORDS = {
  instructions: `Blue Pencil's review and check_spec for files on disk, read inside ${root}; the answers are the hosted Blue Pencil server's. For how to use them, use the blue-pencil skill.`,
  review_files: `Review documents on disk against a Blue Pencil spec file. Reads each document and the spec inside ${root}, calls Blue Pencil's review with their text, and returns each review's YAML unchanged under a line "# <path>", then a table per document: pass, checks, failed, borderline. Each document is one paid review.`,
  check_spec_file: `Check a Blue Pencil spec file inside ${root} without reviewing: returns check_spec's answer unchanged, the spec in normal form or the path of the field at fault. Free.`,
  spec: `path of the spec's YAML file, from ${root}`,
  spec_optional: `path of the spec's YAML file, from ${root}; leave it out to review each document against a spec generated from its headings`,
  documents: `paths of the documents, from ${root}; globs allowed (bad/*.md)`,
  format: "the documents' format: markdown, the only one today",
  save_to: `a folder, from ${root}, to write each review's YAML to as it returns (<document path, its extension replaced by .review.yaml>), and the table as table.md`,
} as const;

serveStdio(() => {
  const server = new McpServer(
    { name: 'blue-pencil-files', version: '0.3.0' },
    { instructions: WORDS.instructions },
  );
  server.registerTool(
    'review_files',
    {
      description: WORDS.review_files,
      inputSchema: z.object({
        spec: z.string().describe(WORDS.spec_optional).optional(),
        documents: z.array(z.string()).min(1).describe(WORDS.documents),
        format: z.string().describe(WORDS.format),
        save_to: z.string().describe(WORDS.save_to).optional(),
      }),
    },
    (input) => tools.reviewFiles(input),
  );
  server.registerTool(
    'check_spec_file',
    {
      description: WORDS.check_spec_file,
      inputSchema: z.object({ spec: z.string().describe(WORDS.spec) }),
    },
    (input) => tools.checkSpecFile(input),
  );
  return server;
});
