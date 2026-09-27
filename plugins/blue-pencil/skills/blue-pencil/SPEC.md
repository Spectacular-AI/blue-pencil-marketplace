# The spec

A spec is YAML. `check_spec` is its source of truth: it returns the spec in normal form, or the path of
the field at fault. `catalog` lists every assertion with how it is written, the part types it applies
to and the question the review asks for it, and every package with its options and items.

```yaml
title: Service runbook
description: The engineer on call reads it during an incident and can restore the service without help.
packages:
  banned_words: {option: default}
asserts:
  must_use: ['the service''s name, "payments-api", as it is written in code']
  must_not_use: ['"simply" or "just" used to make a step sound easy']
children:
  frontmatter:
    type: frontmatter
    present: required
    children:
      owner:
        type: field
        name: owner
        present: required
        asserts:
          must_say: ["a team's name, not only a person's name"]
  steps:
    type: section
    name: Steps
    description: the numbered procedure that restores the service
    present: required
    comes: {before: rollback}
    asserts:
      should: ['uses the imperative mood: each step starts with a verb, as in "Restart the worker"']
    children:
      step-list:
        type: list
        description: the steps, in the order they are done
        present: required
        asserts:
          every_entry: [name one action and the command or screen it uses]
      restart:
        type: code
        description: the command that restarts the service
        language: bash
  rollback:
    type: section
    name: Rollback
    description: how to undo the procedure if it makes things worse
    present: {when: ['it changes data: it writes to, migrates or deletes a stored record']}
  contacts:
    type: section
    name: Contacts
    description: who to call when the steps do not work
    comes: last
    children:
      contact-table:
        type: table
        description: the people and teams to call
        columns: {required: [name, role, phone], forbidden: [home address]}
        asserts:
          must_not_use: [{text: '"simply" or "just" used to make a step sound easy', off: true}]
  internal-notes:
    type: section
    name: Internal notes
    description: notes meant only for the team that owns the service
    present: forbidden
```

## The top

- `title`: the kind of document. `description`: the goal. Both are for readers of the spec: the review
  never checks them.
- `packages`: preset rules, each package one kind of rule (below). A package left out is off.
- `asserts`: rules about the whole document.
- `children`: the parts of the document, each keyed by a name you choose.

## Parts

Every part has a `type`, and is found in the document by what identifies it:

| `type` | Is | Found by | Holds |
|---|---|---|---|
| `section` | A heading and everything under it | `name`, its heading, **and** `description` | Sections, tables, lists, code blocks |
| `table` | A table | `description`, inside its parent section | Nothing |
| `list` | A list | `description`, inside its parent section | Nothing |
| `code` | A fenced code block | `description`, inside its parent section | Nothing |
| `frontmatter` | The YAML metadata between `---` fences at the very top | Its type alone; at the top of the spec, once | Fields |
| `field` | One key of the frontmatter | `name`, the key exactly | Nothing |

- **Key**: lower case words joined by hyphens (`next-steps`, `step-list`); it names the part in paths.
  Sibling sections' headings must give different keys.
- **`description`** says what the part is for, as a noun phrase that completes "a table that is …": "the
  people and teams to call". The review names a part by its heading and its description together, so
  a heading in other words for the same thing ("Changelog", "Revision history") is found, and a close
  heading that means something else ("Field notes" for "Fields") is not. Say only what the part is for,
  never how good it must be: qualities go in `asserts`.
- **A section at the top of the spec is found anywhere in the document**, under its title heading
  included. `generate_spec` keys the title heading as a section holding the rest; keep that part only
  when a rule is about it. A section the spec puts inside another is found only inside it, at any
  depth. A table, list or code block counts anywhere inside its parent section, subsections included.
- **Content in the wrong place is not the part**: a fields table under "Summary" does not give the
  document a "Fields" section.
- **A field's key is exact**: `descripton`, `Description` and a `description` nested under another key
  are not a `description` field; a `description` with an empty value is. Any YAML map between `---`
  fences at the very top is frontmatter, an empty one included; a sentence or list there, YAML that does
  not parse, or a fenced block after the title is not.
- A part's children are looked for only when the part is found.

## Container assertions: a part's own fields

| Field | Written | On | Checks |
|---|---|---|---|
| `present` | `required`, `optional` (the default), `forbidden`, or `{when: [conditions]}` | Every part | Whether the part is there |
| `comes` | `first`, `last`, or `{before: <sibling section's key>}` | `section` | Where it sits among its siblings |
| `columns` | `{required: [...], forbidden: [...], only: [...]}` | `table` | Its column headings |
| `language` | a language's name | `code` | The name after its opening fence |

- **`present: {when: [...]}`**: the part is required when any condition holds of the document, and may
  be there or not when none does. Write a condition as a clause about the document, scoped to what it
  documents: "it describes a breaking change to the schema it documents", not "a breaking change". Define
  a term when an instance of it should count: "it changes data: it writes to, migrates or deletes a
  stored record". A document that says only that the condition does not hold ("no breaking changes")
  does not meet it.
- **`comes: last`**: no section at the same heading level or higher comes after it; its own subsections
  do not count. `before` names a sibling section by its key.
- **`columns`** match a table's headings in any case, spacing or short form ("Name", "desc",
  "internal_id"). A value in a row is never a column. `only` means exactly those columns: each present
  and no other. The three combine, each column a check of its own.
- **`language`** matches the name after the opening fence, a short name included (`ts`, `TS`,
  `typescript` for TypeScript). A block with no name, or another name, fails, whatever its content is
  written in.

## Content rules: `asserts`

`asserts` holds rules about a part's text, by kind; each kind a list of rules. On a part, a rule reads
that part and everything inside it; at the top, the whole document.

| Kind | Checks | Write the rule as | Anti form |
|---|---|---|---|
| `must_say` | Meaning: the part states it outright | What must be said, a noun phrase: "what the schema is for" | `must_not_say` |
| `must_use` | Wording: the writer's own text contains a word or mark | The word with its nuance: '"leverage" used as a verb' | `must_not_use` |
| `should` | Tone: how all the text reads, graded; one lapse fails | What the text does: "reads plainly, without jargon" | None: the rule's own words carry it |
| `every_entry` | Every entry of a list, one by one (on a `list` only) | What each entry does, completing "every entry …": "start with a date" | None |

- **Meaning is stated outright, in the part it is written on.** Said elsewhere, or only implied, it
  fails. Put in the rule what must not count when a reader could take it for the thing: "when an agent
  should use the skill, not only what the skill does"; "a field marked deprecated or to be removed".
- **Two parts agreeing is one rule, on a part that holds both**: the top, when they are sibling
  sections, since a rule on a section reads that section alone. Name the comparison in the rule: "each
  amount the Summary names, with the value the table of fields gives it". As `must_say` it also fails
  when the Summary names no amount; as `must_not_say` of a mismatch ("an amount in the Summary that
  differs from the one the table of fields gives") it passes when there is nothing to compare.
- **Wording names every form and each mark by its character**: '"seamless" in any form, such as
  "seamlessly"' (otherwise an adverb is not read as its adjective); 'an exclamation mark ("!")'. A word
  inside code, or in someone else's quoted words, is not the writer's own and does not count; a table
  cell and a frontmatter value do. A pattern is written as `must_not_use` of what breaks it: "a character
  that does not belong in a lower-case hyphenated name, such as a capital letter, an underscore or a
  space".
- **A tone rule says what it means, with an example when it is grammar**: 'uses the active voice: in
  each sentence the subject does the action, as in "The worker retries the job"'. A tone rule that breaks
  on words you can list ("no exclamation marks") is written as `must_not_use`.
- **An every-entry rule states its boundary**: "consist only of a date and a short description of the
  change: anything more, even a name, a code, a link or a clause saying why, breaks this". A plain
  `must_say` about all the entries misses one bad entry among good ones.
- One thing per rule, in words a reader could check against the text alone. A rule listing
  alternatives passes when any one of them is met, so list only alternatives each of which is enough on
  its own, as the instances in a definition are.
- A rule is its text, or `{text, cascade}`, or `{text, off: true}` (below). The review never sees the
  file's name, so a rule about it fails; the title heading is text like any other.
- **Quote a rule that holds a comma** inside `[...]`, or write the list one rule per `- ` line: YAML
  splits `[a team's name, not only a person's]` into two rules. `check_spec` accepts both, so read the
  rules it returns.

## Cascade

A **cascading** rule is asked of the part it is written on and of every part below it, each copy
reading only its own part's text (the parts inside it carry their own copy), so each piece of text is
checked once. A rule that does not cascade is asked of its part alone, reading everything inside it.

- `should` and `must_not_use` cascade by default; the other kinds do not. Set it per rule:
  `{text: …, cascade: false}` keeps a `should` on its own part; `{text: …, cascade: true}` passes a rule
  of another kind down. Each copy is a check: on a spec of fifteen parts, one cascading rule is fifteen
  checks, so a rule about one feature anywhere in the document ("a markdown link") is one check with
  `cascade: false`.
- **Turn a rule off below a part** with `{text: <its text, exactly>, off: true}` of the same kind on
  that part: it is not asked there or in the parts below. In the example, the contact table is spared
  the top's rule about "simply".
- A rule written again on a part below replaces the copy from above, and its own `cascade` decides
  whether it goes further.
- Cascades stop at the frontmatter: a rule reaches a field only when written on it.

## Packages

A package is a preset of rules of one kind (`catalog` shows each package's `kind`): tone packages hold
`should` rules, banned words `must_not_use`. Its rules are asked as if written in the top's `asserts`,
so they cascade to every part.

- At the top: `<package>: {option: <option>}`, and `items: {<item>: "off"}` (quoted) to turn an item off
  or `items: {<item>: <new wording>}` to reword it.
- On a part: `packages: {<package>: {items: {<item>: "off" | <new wording>}}}` overrides an item there
  and below. The package must be named at the top, and the item must belong to the option chosen there.
- Every item is a check on every part: banned words' 44 items on a spec of six parts make over 250
  checks. Choose a package for what the goal needs, not by default.

## Paths and keys

A review names a part by its **part path**: the keys from the top joined by dots, such as
`contacts.contact-table`; the whole document is `whole_document`. `check_spec` names a field by its
longer path through `children`: `children.contacts.children.contact-table.columns`. Within a part, each
check is named by its key:

| Check key | Field in the spec |
|---|---|
| `present` | the part's `present`, `required` or `forbidden` |
| `present.when` | the part's `present.when`, all its conditions |
| `comes` | the section's `comes` |
| `columns.required.<name>`, `columns.forbidden.<name>` | that column in the table's `columns` |
| `columns.only` | the table's `columns.only` |
| `language` | the code block's `language` |
| `asserts.<kind>.<n>` | the part's own `asserts.<kind>`, rule `n` counted from 0 |
| `<path>.asserts.<kind>.<n>` | a cascaded copy of that rule, written on the part at `<path>` (`whole_document` for the top) |
| `<package>.<item>` | the package item, chosen at the top or overridden on this part or above |

## Known limits

Measured on the review's questions; a spec cannot fix these, only avoid them.

- A heading in near-synonyms of the `name` ("Upgrading" for "Migration") is found at 0.43 to 0.49: give
  `name` the heading writers use.
- Two sections that fit one part, or two with the same heading, leave the part's checks unsure.
- "Comes before" on a part that is absent can still pass; read it beside the part's `present`.
- `comes: first`, optional parts, a spec with only `forbidden` columns, a document with many tables, and
  large documents are not measured yet.
- A table's rows are not entries: `every_entry` is for lists, and no assertion asks about every row.
  `must_not_say` of the breaking row ("a row whose Required cell is something other than yes, no or a
  condition") failed tables whose rows broke it (.06 to .21 on three copies) but was unsure on one
  (.43) and passed another (.57); `should` answered "a few lapses" on right tables, unsure there.
- **The title heading and the lead** (the text under it before the first section) have no part: a spec
  for many documents cannot name a title that differs in each. A rule about them goes at the top, where
  it reads the whole document, so a lead that leaves out what the body says still passes: three copies
  whose lead lost its first sentence, its purpose or its format passed at .50 to .54. Scoping the rule
  in words ("in the opening paragraph, …"), or cascading it from the top with every section turned off
  so the top's copy reads only the title and the lead, did not catch them (.61 to .80). For a rule about
  the title's form (a noun phrase, not a sentence), no kind was decisive both ways: `must_not_use` and
  `should` gave .39 to .43 on a title written as a sentence and .51 to .70 on right ones, and
  `must_not_say` passed the sentence (.73 to .83). Name such checks in your report as limits.
- Meaning: a description saying only when not to use a thing ("Not for code review") reads as half of
  saying when to use it, unsure either way.
- Wording, a pattern: a space in the value and a capital inside it are missed; a leading capital and an
  underscore are caught.
- `present` on the frontmatter was unsure (.55 to .79) on two long notes that have it, and on many of
  their copies; the spec has nothing that changes it.
- Length and counts are not checked: the review does not count. A 251-character value passed "a value
  longer than 150 characters" at .59 to .71 over four reviews. Leave such a rule out of the spec.
- Tone on a part with nothing it applies to (a rule about sentences on a table) passes, at the edge of
  sure.
