# Installing Blue Pencil

For a person setting up Claude Code; the agent does not need this file.

## As a plugin

The `blue-pencil` plugin holds this skill and two MCP servers: the hosted one, and a local one that
reviews files on disk (it needs `node` 20 or later on the `PATH`). In a shell:

```bash
claude plugin marketplace add Spectacular-AI/blue-pencil-marketplace
claude plugin install blue-pencil@blue-pencil
```

In the Claude desktop app, add the marketplace `Spectacular-AI/blue-pencil-marketplace` from the plugin
browser, then install `blue-pencil`.

Start a new session. The skill is then `blue-pencil:blue-pencil`, and `/mcp` shows two servers:
`plugin:blue-pencil:blue-pencil` with four tools (`catalog`, `generate_spec`, `check_spec` and `review`),
and `plugin:blue-pencil:blue-pencil-files` with two (`review_files` and `check_spec_file`). To take a
newer version, run `claude plugin marketplace update blue-pencil`, then
`claude plugin update blue-pencil@blue-pencil`.

## By hand, in one repo

1. Copy this folder into the repo as `.claude/skills/blue-pencil/`, and the plugin's
   `server/dist/blue-pencil-files.mjs` anywhere on the machine.
2. Add the servers to the repo's `.mcp.json`, with that file's absolute path:

   ```json
   {
     "mcpServers": {
       "blue-pencil": {
         "type": "http",
         "url": "https://blue-pencil-nu.vercel.app/api/mcp"
       },
       "blue-pencil-files": {
         "command": "node",
         "args": ["/absolute/path/to/blue-pencil-files.mjs"]
       }
     }
   }
   ```

3. Start a new session: Claude Code connects to MCP servers when a session starts. `/mcp` then shows
   `blue-pencil` with four tools (`catalog`, `generate_spec`, `check_spec` and `review`) and
   `blue-pencil-files` with two (`review_files` and `check_spec_file`).
