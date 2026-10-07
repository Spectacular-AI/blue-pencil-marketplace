# Installing Blue Pencil

For a person setting up Claude Code; the agent does not need this file.

## As a plugin

The `blue-pencil` plugin holds two skills, the hosted MCP server and fast mode (below). In a shell:

```bash
claude plugin marketplace add Spectacular-AI/blue-pencil-marketplace
claude plugin install blue-pencil@blue-pencil
```

In the Claude desktop app, add the marketplace `Spectacular-AI/blue-pencil-marketplace` from the plugin
browser, then install `blue-pencil`.

Start a new session. The skills are then `blue-pencil:blue-pencil-spec` and
`blue-pencil:blue-pencil-review`, and `/mcp` shows the server
`plugin:blue-pencil:blue-pencil`. To take a newer version, run
`claude plugin marketplace update blue-pencil`, then `claude plugin update blue-pencil@blue-pencil`.

## Sign in

The server needs a Blue Pencil account. In `/mcp`, choose it and Authenticate: the browser opens Blue
Pencil's sign-in, where you pick the account to use, your own or a team's. It then has four tools
(`catalog`, `generate_spec`, `check_spec` and `review`) on Premium, or `review` alone on Basic. To use
another account, authenticate again.

## By hand, in one repo

1. Copy the two folders in `skills/` into the repo's `.claude/skills/`, side by side: each reads files
   of the other.
2. Add the server to the repo's `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "blue-pencil": {
         "type": "http",
         "url": "https://slop-or-not.ai/api/mcp"
       }
     }
   }
   ```

3. Start a new session: Claude Code connects to MCP servers when a session starts. `/mcp` then shows
   `blue-pencil`; sign in as above.

## Fast mode

In Claude Code, fast mode lets the agent review a document on disk without writing its text into the
`review` tool: a script in the plugin sends the file with an API key and saves the review beside it.
Keys belong to a team on Enterprise: a member makes one at https://slop-or-not.ai/keys, with the
`review` scope. When a session starts, the plugin looks for the key as `BLUE_PENCIL_API_KEY`, in the
environment, then in the project's `.env.local`, then `.env`; it needs `node` 20 or later. With no
key, the agent reviews through the server as above.

On a laptop:

1. Put the key in the project's `.env.local`, which git must ignore:

   ```bash
   BLUE_PENCIL_API_KEY=ak_…
   ```

   The plugin refuses a key in a file git tracks.
2. Keep the agent from reading the file, so the key never enters a transcript. In the project's
   `.claude/settings.json`:

   ```json
   {
     "permissions": {
       "deny": ["Read(./.env*)"]
     }
   }
   ```

3. Start a new session. The agent is told fast mode is on, and where the key came from.

In a Claude Code cloud environment:

1. Add `BLUE_PENCIL_API_KEY` to the environment's variables; they last across its sessions.
2. Allow `slop-or-not.ai` in the environment's network policy, Custom or Full. The default, Trusted,
   blocks it.

The script, `scripts/review.mjs`, takes `--output yaml|json`, `--detail compact|full`,
`--outcomes fail,borderline,pass`, `--echo-spec auto|always|never` and `--staged`; `scripts/README.md`
says what each does. With `--staged` it reviews what git's index holds, not the disk, so a project can
run it as its own pre-commit hook; with `--output json` its stdout is one JSON row per document, whose
`pass` the hook reads (the exit code says only whether every review was answered).
