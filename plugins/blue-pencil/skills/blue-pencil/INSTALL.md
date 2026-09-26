# Installing Blue Pencil

For a person setting up Claude Code; the agent does not need this file.

## As a plugin

The `blue-pencil` plugin holds this skill and the MCP server. In a shell:

```bash
claude plugin marketplace add Spectacular-AI/blue-pencil-marketplace
claude plugin install blue-pencil@blue-pencil
```

In the Claude desktop app, add the marketplace `Spectacular-AI/blue-pencil-marketplace` from the plugin
browser, then install `blue-pencil`.

Start a new session. The skill is then `blue-pencil:blue-pencil`, and `/mcp` shows the server as
`plugin:blue-pencil:blue-pencil` with four tools: `catalog`, `generate_spec`, `check_spec` and `review`.
To take a newer version, run `claude plugin marketplace update blue-pencil`, then
`claude plugin update blue-pencil@blue-pencil`.

## By hand, in one repo

1. Copy this folder into the repo as `.claude/skills/blue-pencil/`.
2. Add the server to the repo's `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "blue-pencil": {
         "type": "http",
         "url": "https://blue-pencil-nu.vercel.app/api/mcp"
       }
     }
   }
   ```

3. Start a new session: Claude Code connects to MCP servers when a session starts. `/mcp` then shows
   `blue-pencil` with four tools: `catalog`, `generate_spec`, `check_spec` and `review`.
