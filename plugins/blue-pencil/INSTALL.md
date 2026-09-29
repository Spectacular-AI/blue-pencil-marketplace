# Installing Blue Pencil

For a person setting up Claude Code; the agent does not need this file.

## As a plugin

The `blue-pencil` plugin holds two skills and the hosted MCP server. In a shell:

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
