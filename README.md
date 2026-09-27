# Blue Pencil for Claude Code

A Claude Code plugin marketplace with one plugin, `blue-pencil`: the Blue Pencil MCP server, which reviews
markdown documents against a spec, and the skill that teaches an agent to use it (review a document,
revise it until it passes, write a spec from a goal, tune a spec against examples).

```bash
claude plugin marketplace add Spectacular-AI/blue-pencil-marketplace
claude plugin install blue-pencil@blue-pencil
```

In the Claude desktop app, add the marketplace `Spectacular-AI/blue-pencil-marketplace` from the plugin
browser, then install `blue-pencil`.

Then ask your agent, for example: "Use the blue-pencil skill to review docs/fields.md against
specs/schema-note.yaml". The skill can also be run directly as `/blue-pencil:blue-pencil`.

## What is here

- `.claude-plugin/marketplace.json`: the marketplace, named `blue-pencil`.
- `plugins/blue-pencil/`: the plugin. `.mcp.json` names two servers: the hosted one
  (`https://blue-pencil-nu.vercel.app/api/mcp`), and `blue-pencil-files`, a local server that reviews
  files on disk through the hosted one's tools (`server/`, whose README says how to rebuild it);
  `skills/blue-pencil/` is the skill, and the one place it is written.

The plugin's version is `version` in `plugins/blue-pencil/.claude-plugin/plugin.json`. Claude Code offers
an update only when it changes, so raise it in every change to the plugin: the minor number when the
spec it teaches, the servers' tools or their answers change, the patch number for wording.
