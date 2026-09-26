# The spec

A spec is YAML. `check_spec` is its source of truth: it returns the spec in normal form, or the path of
the field at fault. `catalog` lists everything a spec can name: the question kinds, the packages with
each option and item, and the answers each kind can give.

```yaml
title: Release note
description: An engineer on another team reads it and knows what changed and what they must do.
packages:
  banned_words: {option: default}
  writing_structure:
    option: default
    items: {one-idea-per-bullet: "off"}
asserts:
  includes: [the version number and the day it ships]
sections:
  what-changed:
    name: What changed
    description: the part of `message` that lists the changes a user would notice
    present: required
    asserts:
      includes: [every change a user would notice]
      conveys: [which changes break existing setups]
  upgrade-steps:
    name: Upgrade steps
    description: the part of `message` that says how to upgrade
    present: {rule: optional, when: [the release changes the database schema]}
    asserts:
      excludes: [internal ticket numbers]
```

## The top

- `title`: the kind of document. `description`: the goal. Both are for readers of the spec: the review
  never checks them.
- `packages`: the writing checks, asked in every section. A package left out is off. Each takes an
  `option`, and `items` to turn one off (`"off"`, quoted) or to reword it.
- `asserts`: lines about the whole document.
- `sections`: the parts of the document, keyed by heading.

## A section

- **Key**: its heading in lower case, with hyphens for spaces and punctuation (`Next steps` →
  `next-steps`). Sibling keys must differ.
- `name`: the heading to look for. Leave it out for a part with no heading; the review then finds the
  part by its description and always checks it.
- `description`: where the part is, as a whole phrase starting "the part of `message`": "the part of
  `message` that says how to upgrade". `message` is how every question names the document, so keep it
  as written, in backticks. Say only where the part is, never how good it must be: the presence check
  also asks whether the part does what its description says, so a quality in the description ("one
  dated entry per change") turns presence into a quality check. When that fails, the section counts as
  not found, and its own checks are never asked. Put qualities in `asserts` lines.
- `present`: `required` (missing is a failed check), `optional` (the default; absent is fine), or
  `{rule: optional, when: [conditions]}` (absent fails when a condition is true of the document). Only
  a section with a `name` has a presence.
- `asserts`: lines for this part (below).
- `packages`: this section's own item overrides, `{<package>: {items: {<item>: "off" | new wording}}}`.
  The package must be on at the top, and the item must belong to the option chosen there.
- `sections`: sections inside this one. A section is looked for only when its parent was found.

## Asserts: the three kinds

| Kind | Asks | Passes when |
|---|---|---|
| `includes` | Does the document state this in the section? | Stated in the section, or elsewhere in the document |
| `conveys` | Does the document state this fact, in the section? | Stated in full, in the section or elsewhere; not contradicted, hedged or partial |
| `excludes` | Does the document contain this, anywhere? | Not contained anywhere: the section does not narrow it |

- `includes` when a topic or a thing must be covered: "the steps to roll back". For a feature of the
  text's form, such as a link, describe the form exactly: "a link written as [[double brackets]] or as a
  relative link to a .md file; links to web pages do not count". A loose wording ("links to related
  notes") gets `partly` answers, and can be credited to a sentence that only talks about links.
- `conveys` when a claim must be stated in full, not hedged and not contradicted: "the migration takes
  under a minute".
- `excludes` for what must not appear: it looks at the whole document, so it belongs at the top unless
  it reads naturally with one section. To aim it at one part, make the part itself the thing excluded,
  and name its heading: "a bullet under the Change log heading that names a person". A prefix ("in a
  change log entry, a person's name") does not narrow it, and "a change log entry" alone also matches
  look-alikes elsewhere, such as dated source lines at the top. A top-level line can be aimed at the
  parts before or after a section the same way: "above the change log, …".

**Rules about order or position** ("the change log comes last") suit none of the three as a statement:
`includes` and `conveys` look for a sentence that says so, and no document says where its own parts sit.
Write the rule as an `excludes` of the arrangement that breaks it: "below the change log, any heading or
paragraph that is not a change log entry".

Write one thing per line, in words a reader could check against the text alone: "the version number and
the day it ships" rather than "the key details". A list of alternatives passes on its loosest item, so
list only alternatives each of which would be enough on its own.

The review reads the whole text sent: frontmatter and metadata lines (`> Sources: …`) are part of the
document and can match a line. It does not see a file's name, so a line about "the note's title" is
unsure on a note whose title is only its file name.

## From a goal to asserts

The goal says what a reader can do after reading. Each thing they need in order to do it becomes a line:

- Goal: "an engineer on another team knows what changed and what they must do."
- "what changed" → `includes: [every change a user would notice]` in `what-changed`.
- "what they must do" → a `required` or conditional `upgrade-steps` section, with its own lines.

Every clause gets a line, and every line serves a clause.

## Paths

A review names a section by its **section path**, the keys from the top joined by dots. In the example,
`upgrade-steps` sits at `sections.upgrade-steps`; a section `rollback` inside it would have the section
path `upgrade-steps.rollback` and sit at `sections.upgrade-steps.sections.rollback`. `check_spec` names a
field by that longer path. A check's key names a field inside its section:

| Check key | Field in the spec |
|---|---|
| `asserts.includes.0` | the section's `asserts.includes`, first line |
| `present` | the section's `present` |
| `present.when` | the section's `present.when`, all its conditions |
| `<package>.<item>` | `packages.<package>.items.<item>` at the top, or the section's own override |

The whole document's section path is `whole_document`: its checks are the top-level `asserts`.
