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
- `plugins/blue-pencil/`: the plugin. `.mcp.json` points at the hosted server
  (`https://blue-pencil-nu.vercel.app/api/mcp`); `skills/blue-pencil/` is the skill, and the one place it
  is written.

Each change to the plugin reaches people who update, since the plugin sets no version and Claude Code
then follows this repo's commits.
