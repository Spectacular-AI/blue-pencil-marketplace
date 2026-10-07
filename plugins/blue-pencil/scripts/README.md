# scripts

Fast mode's two scripts: Blue Pencil reviews of files on disk, with a team's API key, so the agent
names a document by its path instead of writing its whole text into the MCP `review` tool's
arguments. Writing the text was most of what a revise loop cost: in the first end test, most of its
$90.70.

- **`review.mjs`**: `node review.mjs <document|glob>... [--spec <spec.yaml>] [--out <folder>]`. Each
  document is one paid review, `POST /api/review` with `Accept: application/yaml`, three at a time;
  its YAML, the MCP tool's shape, is saved as `<document without its extension>.review.yaml` beside it,
  or under `--out` with its path from the project root. It prints a table, per document pass, score,
  checks, failed, borderline and the YAML's path, or `error: <code>` with a line saying why, then
  `key from <source>`. Nothing of the reviews themselves. Without `--spec`, the review builds a spec
  from the document's headings. Exit 0 when every document was reviewed, passing or not; 1 when any
  review answered with an error; 2 when nothing was sent: no key, a refused path, a spec that is not
  YAML, bad arguments.
- **`mode.mjs`**: the plugin's `SessionStart` hook (`../hooks/hooks.json`). With a key it prints two
  lines, which reach the agent's context: fast mode is on, review with `review.mjs` by its absolute
  path, never open `.env` files. Without one it prints nothing. A key in a file git tracks prints one
  line, fast mode off and why. It makes no network call and always exits 0.

## Rules

- **The key**, first found wins: `BLUE_PENCIL_API_KEY` in the environment, then in `.env.local`, then
  in `.env`, each file looked for in the working directory and then at the git repository's root. From
  a file only that variable is read. A key in a file git tracks is refused, naming the file. The key is
  never printed; the scripts name only its source. Keys are a team's, on Enterprise, made at
  https://slop-or-not.ai/keys with the `review` scope (`src/key.ts`).
- **Paths stay inside the project**: the git repository's root, else the working directory. A path,
  glob or link that leads outside it, a spec or `--out` too, is refused before any review
  (`src/paths.ts`).
- **The site** is production, `https://slop-or-not.ai`, unless `BLUE_PENCIL_URL` names another, such as
  `http://localhost:3009` or a preview. `BLUE_PENCIL_BYPASS`, when set, is sent as
  `x-vercel-protection-bypass`, which a preview needs (`src/api.ts`).
- **Errors are the route's codes**, one row each; `rate_limited` waits 10 seconds and retries that
  document once. Codes of the script's own: `no_answer` (the server could not be reached),
  `old_server` (it answered JSON: a deployment before the YAML answer), `unexpected_answer`,
  `unreadable_answer` (YAML without a headline; saved all the same) and `http_<status>` (an error
  without a code).
- **It scripts the transport, never the judgment** (D54): every number in the table is read from the
  review's own headline.
- **Self-contained.** `review.mjs` and `mode.mjs` are bundles, committed, run with `node` 20 or later
  and no install. Not a `bin/` folder: claude.ai and Cowork refuse a plugin that has one.

## Build and test

With [Bun](https://bun.sh), in this folder:

```bash
bun install      # dev dependencies, pinned; node_modules is not committed
bun run check    # tsc, then the unit tests (src/*.test.ts), with a fake fetch only
bun run build    # writes review.mjs and mode.mjs
```

Rebuild after every change to `src/`, and commit the bundles with it. The tests never call the real
server: `src/review.test.ts` runs the script through `review()` on a real folder with a fake fetch.
