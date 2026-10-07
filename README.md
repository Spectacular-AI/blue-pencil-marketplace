# Blue Pencil for Claude Code

A Claude Code plugin marketplace with one plugin, `blue-pencil`: the Blue Pencil MCP server, which reviews
markdown documents against a spec, and two skills that teach an agent to use it: `blue-pencil-spec`
works out with you what a good document of yours is and writes it as a spec, and tunes a spec;
`blue-pencil-review` reviews a document against its spec and revises it until it passes.

```bash
claude plugin marketplace add Spectacular-AI/blue-pencil-marketplace
claude plugin install blue-pencil@blue-pencil
```

In the Claude desktop app, add the marketplace `Spectacular-AI/blue-pencil-marketplace` from the plugin
browser, then install `blue-pencil`.

Then ask your agent, for example: "This email reads sloppy. Help me make it less sloppy", or "Review
docs/fields.md against specs/schema-note.yaml". The skills can also be run directly, as
`/blue-pencil:blue-pencil-spec` and `/blue-pencil:blue-pencil-review`.

## What is here

- `.claude-plugin/marketplace.json`: the marketplace, named `blue-pencil`.
- `plugins/blue-pencil/`: the plugin. `.mcp.json` names the hosted server
  (`https://slop-or-not.ai/api/mcp`), which signs the user in through the browser.
  `scripts/` is fast mode: `review.mjs` reviews files on disk through the hosted review route, and
  `mode.mjs` tells the agent at the start of a session whether fast mode is on; its README says how to
  rebuild them. `hooks/hooks.json` runs `mode.mjs` when a session starts. `skills/blue-pencil-spec/`
  and `skills/blue-pencil-review/` are the skills, and the one place they are written; each file is
  kept in one of the two folders and the other links to it. `INSTALL.md` is for a person setting the
  plugin up.

The plugin's version is `version` in `plugins/blue-pencil/.claude-plugin/plugin.json`. Claude Code offers
an update only when it changes, so raise it in every change to the plugin: the minor number when the
spec it teaches, the servers' tools or their answers change, the patch number for wording.

## Fast mode

In Claude Code, the agent can review a document where it lies instead of sending its text to the MCP
server: a script in the plugin reads the file, asks for the review with a team's API key, saves the
review beside the document and shows the agent a short table. It costs the agent far fewer tokens on
a long document. Keys belong to a team on Enterprise. To turn it on, give the project the key as
`BLUE_PENCIL_API_KEY`; `plugins/blue-pencil/INSTALL.md`, "Fast mode", says how. Without a key, the
agent reviews through the MCP server as before.
