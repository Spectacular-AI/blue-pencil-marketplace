# scripts

Fast mode's two scripts: Blue Pencil reviews of files on disk, with a team's API key, so the agent
names a document by its path instead of writing its whole text into the MCP `review` tool's
arguments. Writing the text was most of what a revise loop cost: in the first end test, most of its
$90.70.

- **`review.mjs`**: `node review.mjs <document|glob>... [options]`. Each document is one paid review,
  `POST /api/review`, three at a time; its answer is saved as `<document without its extension>.review.yaml`
  (or `.review.json`) beside it, or under `--out` with its path from the project root. Nothing of the
  reviews themselves is printed: per document pass, score, checks, failed, borderline and the saved
  answer's path, or `error: <code>` with why. Without `--spec`, the review builds a spec from the
  document's headings. Exit 0 when every document was reviewed, passing or not; 1 when any review
  answered with an error; 2 when nothing was sent: no key, a refused path, a spec that is not YAML or
  JSON, a bad option.

  | Option | Does |
  |---|---|
  | `--spec <file>` | The spec, a `.yaml`, `.yml` or `.json` file, sent as its map |
  | `--out <folder>` | Where the answers are saved, in place of beside each document |
  | `--output yaml\|json`, `-o` | The answer's encoding (`Accept`) and the saved file's extension; `yaml` by default. With `json`, stdout is a JSON array of rows, `{document, pass, score, checks, failed, borderline, review}` or `{document, error, message}`, and `key from <source>` goes to stderr, so stdout pipes; with `yaml`, a markdown table, the errors' reasons and `key from <source>` |
  | `--detail compact\|full` | The route's `detail`: how much each part and check holds |
  | `--outcomes <list>` | The route's `outcomes`: which checks are listed, comma-separated `fail`, `borderline`, `pass`; empty lists none. The headline counts every check |
  | `--echo-spec auto\|always\|never` | The route's `echo_spec`: whether the spec used comes back |
  | `--staged` | Read each document, and the spec, from git's index, not the disk (`src/staged.ts`) |

  `--detail`, `--outcomes` and `--echo-spec` are checked here, then sent as query parameters only when
  given, so the route's defaults stay its own. **`--staged`** reviews what the next commit holds, so the
  script can be a pre-commit hook: a path must be in the index (a regular file, merged), a glob matches
  the index's paths, and a file gone from disk but still staged is reviewed; its answer is saved where
  the file is in the working tree. Outside a git repository it is refused.
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
  (`src/paths.ts`). With `--staged`, a staged file whose folder on disk is a link out of the project is
  refused too, since its answer would be saved there.
- **The site** is production, `https://slop-or-not.ai`, unless `BLUE_PENCIL_URL` names another, such as
  `http://localhost:3009` or a preview. `BLUE_PENCIL_BYPASS`, when set, is sent as
  `x-vercel-protection-bypass`, which a preview needs (`src/api.ts`).
- **Errors are the route's codes**, one row each, read from an error body in either encoding (the YAML
  parser reads JSON too); `rate_limited` waits 10 seconds and retries that document once, and
  `unsupported_media_type` says to update the plugin. Codes of the script's own: `no_answer` (the
  server could not be reached), `old_server` (it answered the other encoding than the one asked: an
  older deployment), `unexpected_answer` (neither YAML nor JSON), `unreadable_answer` (an answer
  without a headline; saved all the same) and `http_<status>` (an error without a code).
- **It scripts the transport, never the judgment** (D54): every number in the table or the rows is read
  from the review's own headline, `review: {pass, score, checks, failed, borderline, …}`, the same in
  either encoding.
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
