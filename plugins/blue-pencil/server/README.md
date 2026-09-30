# blue-pencil-files

**Switched off** (Drew, 2026-09-28): the plugin's `.mcp.json` does not start this server since 0.6.0,
when the hosted server began to require sign-in, which this server does not do yet. The code is kept
to switch back on: it would need OAuth sign-in of its own first.

The plugin's local MCP server (stdio): Blue Pencil's `review` and `check_spec` over files on disk, so an
agent names a document by its path instead of writing its whole text into a tool call. Writing the text
was most of what tuning a spec cost: in the first end test, the worker's arguments to `review`, not the
reviews, made up most of its $90.70.

**It scripts the transport, never the judgment.** Each tool reads the files and calls the hosted
server's own tool with their text, and returns that answer unchanged. The only thing it adds is
`review_files`' table, read from each review's YAML (its headline, and the `borderline` counts its
metrics give). Nothing here decides what a check is worth.

## Tools

- `review_files`: `spec` (a path; left out, each document is reviewed against a spec from its headings),
  `documents` (paths or globs), `format`, `save_to` (optional folder). Per document, a text block
  `# <path>` followed by the hosted `review`'s YAML; last, a table of pass, checks, failed and borderline
  per document, with a line for all when there are several. With `save_to`, each review's YAML is
  written there as it returns (`<path without its extension>.review.yaml`) and the table as
  `table.md`. Reviews run three at a time. The error flag is set when a path is refused, or when every
  review answered with an error; a review's own error is its block, and `error: <code>` in its row.
- `check_spec_file`: `spec`, a path. The hosted `check_spec`'s answer, unchanged.

## Rules

- **Paths stay inside the working directory the server starts in** (Claude Code starts it in the
  session's folder). A path, glob or link that leads outside is refused before any hosted call, so a
  worker whose file tools are held to its folder cannot read outside it through this server either. The
  tools' descriptions name the folder.
- **The hosted server** is production (`https://blue-pencil-nu.vercel.app/api/mcp`) unless
  `BLUE_PENCIL_MCP_URL` names another, such as `http://localhost:3009/api/mcp` or a preview deployment.
  `BLUE_PENCIL_BYPASS`, when set, is sent as `x-vercel-protection-bypass`, which a preview needs. The
  server reads both from its environment, which Claude Code passes on from its own.
- **Self-contained.** `dist/blue-pencil-files.mjs` is one bundled file, committed, run with `node` (20 or
  later) and no install. Rebuild it after every change to `src/`, and commit both.

## Build and test

With [Bun](https://bun.sh), in this folder:

```bash
bun install      # dev dependencies, pinned; node_modules is not committed
bun run check    # tsc, then the unit tests (src/*.test.ts)
bun run build    # writes dist/blue-pencil-files.mjs
```

The tests run the tools through `filesTools` (`src/files.ts`) on a real folder with a fake hosted
server: the path checks, the table, saving, and passing answers and errors through unchanged.
`src/hosted.ts` is the one place that talks to the hosted server.
