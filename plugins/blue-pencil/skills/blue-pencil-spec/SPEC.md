# The spec

A spec is YAML. `check_spec` is its source of truth: it returns the spec in normal form, or the path of
the field at fault. `catalog` lists every assertion with how it is written, the part types it applies
to and the question the review asks for it, and every package with its options and items.

```yaml
title: Service runbook
description: The engineer on call reads it during an incident and can restore the service without help.
tone: professional
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
- `define`: the spec's own tones and packages, declared by name; declaring turns nothing on (below).
- `tone`: the voice the whole document reads in, `professional`, `casual`, or a tone the spec declares
  (below). Left out, no tone is checked.
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
  never how good it must be: qualities go in `asserts`. Name nothing in it that only some documents have:
  a Fields section described "with a subsection per nested type" went unfound in notes without one (.25 to
  .31). In a document with many tables, say which one ("the first table of fields": .91 to .97, against
  .63 without).
- **Describe a list by what each entry is**, not by what the entries point to. Entries that name a
  schema and then say how it relates are relations: "the relations to other schemas, one per entry" is
  found more often (.68 to .93 over two rounds), "the related schemas, one per entry" is not (.15 to .55),
  though it is when each entry is one line. A description that loose also fits another list in the same section; say what each
  entry holds in an `every_entry` rule when that matters.
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

## An effective rule

A rule is **effective** when two things hold:

- **The review decides it**: on a document whose answer is known, its check is decisive (below 0.2 or
  above 0.8) and right, and a second review agrees.
- **It holds for the kind**: it is right on documents of the kind that tuning never read, because it
  states something the user wants of every such document. The held-back documents of
  [TUNING.md](TUNING.md) measure this; a spec can pass the first test and fail this one.

So that the review decides it:

- **One idea per rule**, stated outright, with what must not count named in the rule ("Content rules",
  below). A rule unsure on several documents usually holds two ideas or vague words.
- **Ask of each part only what its own text shows.** An `every_entry` rule judges each entry of the list:
  "follows from the user's last answer", an answer outside the list, did not catch an entry off the
  subject.
- **Let the heading find the part.** A heading in other words for the same thing is found; a heading
  that names its topic instead of what the part is for ("Cost and success" for "What I noticed") was
  found in 1 of 3 good documents. Where headings must vary, fix their first words and let the rest vary
  ("What I noticed: cost and success"): all 11 such headings were found.
- **Keep `description` to what the part is for.** A long example in it lowered finding from sure to .21
  to .48; put examples in rules.
- **Condition a part on what the document shows.** "Required unless the message is a quick follow-up"
  was judged wrongly on every follow-up; "required unless a heading starts 'Quick question:'" was right
  at .96 to .99.
- **Check each package item against the goal.** An item can count against what a rule requires ("an
  opening that restates the reader's request", where a part must restate the user's answer): turn it off
  in those parts.
- **Stay clear of "Known limits"**, below: name such a want to the user rather than tune against it.

So that it holds for the kind:

- **Take every rule from the user's goal, not from the examples.** A habit the examples share is a rule
  only when the user says so.
- **Write about the kind, never the instance**: no name, fact or heading that only one sample has. A light
  spec for one document is the exception.
- **A part only some documents have is optional**, or required when a condition holds.
- **Cover the forms the kind takes, and each rule from both sides.** List the forms before tuning (for
  a message to a user: a first message, a new question, a go-ahead, a follow-up) and have a good example
  of each; for a rule, a document that meets it, a near miss, a synonym, the thing in the wrong place, and
  the thing absent. Write each expected result down before the review ([TUNING.md](TUNING.md), "The loop").
- **Expect real documents to behave differently from made ones**: a frontmatter's presence was decided on
  10 of 10 made cases and unsure on real notes.

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
- A rule is its text, or `{text, cascade}`, or `{text, weight}`, or `{text, off: true}` (below); `cascade`
  and `weight` combine. `weight` is a number above 0, 1 unless written: it weights the rule's checks in the
  document score, the weighted mean of every check's value. Only a content rule has one; presence, order,
  columns, language and package items weigh 1. A cascaded copy carries its rule's weight, and a rule
  written again below replaces it. Keep every weight at 1 until the spec is tuned: a weight changes the
  score, never whether a check passes. The review never sees the
  file's name, so a rule about it fails; the title heading is text like any other.
- **Quote a rule that holds a comma** inside `[...]`, or write the list one rule per `- ` line: YAML
  splits `[a team's name, not only a person's]` into two rules. `check_spec` accepts both, so read the
  rules it returns.

## Cascade

A **cascading** rule is asked of the part it is written on and of every part below it, each copy
reading only its own part's text: the sections, tables, lists and code blocks inside it carry their own
copy and are left out, so each piece of text is checked once. The top's copy reads the title and the
text outside every part the spec names (the frontmatter left out); when there is none, it is not asked.
A rule that does not cascade is asked of its part alone, reading everything inside it.

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

## Tone and packages

A package is a preset of rules of one kind (`catalog` shows each package's `kind`): banned words hold
`must_not_use` rules, writing structure `should`. The tone is a package of `should` rules with a key of
its own. Their rules are asked as if written in the top's `asserts`, so they cascade to every part; a
block quote, someone else's words, is left out.

- The tone, at the top: `tone: professional`, or `tone: {option: <tone>, items: {<item>: "off" | <new
  wording>}}` to turn an item off or reword it. Choose it for every spec: it is how the document sounds
  to its reader.
- A package, at the top: `packages: {<package>: {option: <option>}}`, with `items` as the tone's.
- On a part: `tone: {items: {…}}` or `packages: {<package>: {items: {…}}}` overrides an item there and
  below; `"off"` turns the whole tone or package off there and below. Only what the top turns on can be
  overridden, and the item must belong to the option chosen there.
- Every item is a check on every part: banned words' 49 items on a spec of six parts make over 250
  checks. Choose a package for what the goal needs, not by default.

### Your own tone or package

When no built-in fits, declare one under `define:`, then turn it on as a built-in:

```yaml
define:
  tones:
    team_voice:
      items:
        plain-words: uses everyday words, and a technical term only where it is the exact name of the thing
        no-hype: contains no word that sells rather than describes, such as "powerful" or "seamless"
  packages:
    house_words:
      kind: must_not_use
      items:
        synergy: the word "synergy" in any form
tone: team_voice
packages:
  house_words: {option: default}
```

- A tone has `items` and an optional `label`; its rules are `should` rules.
- A package has a `kind`, `items`, and an optional `label` and `skips` (`[quote]` to leave block quotes
  out); it has one option, `default`.
- A declared name equal to a built-in's replaces the built-in for this spec.
- A package's name is lower-case words joined by underscores; item keys are lower-case words joined by
  hyphens. `check_spec` refuses a name or key the review uses for itself, such as `should` or `exists`.
- Write each item as a rule of its kind ("An effective rule", above).

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
| `tone.<item>` | the tone's item, chosen at the top or overridden on this part or above |
| `<package>.<item>` | the package item, chosen at the top or overridden on this part or above |

## Known limits

Measured on the review's questions; a spec cannot fix these, only avoid them.

- A heading in near-synonyms of the `name` ("Upgrading" for "Migration") is found at 0.43 to 0.49: give
  `name` the heading writers use.
- Two sections that fit one part, or two with the same heading, leave the part's checks unsure.
- "Comes before" on a part that is absent can still pass; read it beside the part's `present`.
- `comes: first`, a spec with only `forbidden` columns, a document with many tables, an optional part's
  own rules, and large documents are not measured yet.
- An optional part that is absent reports nothing, and one found by mistake has its rules checked
  against text the document lacks: neither shows as a failed check. An optional section is found when
  its `description` fits what it holds ("worked examples" over one sentence: .66 to .68).
- A table's rows are not entries: `every_entry` is for lists, and no assertion asks decisively about
  every row. Asked of each row, measured on field tables: a cell rule ("the Required cell is yes, no, or
  a condition") let "sometimes", "always" and "maybe" through (.21 to .46); a unit rule for the rows that
  measure something sat near .5; a mark in one column (field names in backticks) caught a whole bad
  table but missed one bad row among 20 (.43 to .51). As `must_not_say` of the breaking row they were
  unsure too (.36 to .71). Keep such rules out of a spec that must be decisive, or read their checks as
  unsure.
- A code block holds no writer's own text: `must_not_use` and `should` on a code block always pass,
  and `must_use` fails, so a wording rule cannot ban a word inside code (the same word in the prose
  around the block can still pull a `must_use` toward passing: .62 to .68). A `must_say` about what
  a code block holds reads a value in code as not stated (.44 to .67); "given as a value in the code" in
  the rule lifts it only to the edge of sure (.80).
- **The title heading and the lead** (the text under it before the first section) have no part: a spec
  for many documents cannot name a title that differs in each. A rule written at the top without
  cascade reads the whole document, so a lead that leaves out what the body says still passes (three
  copies at .50 to .54); scoping it in words ("in the opening paragraph, …") did not help. To aim a rule
  at the title and the lead, write it at the top with `cascade: true` and turn it off (`{text, off:
  true}`) on each part at the top: the top's copy then reads only the title and the text outside the
  named parts (on a whole spec, copies whose lead lost what one record is or its format failed at .11 to
  .17). It takes one `off` per part per rule; YAML anchors keep them short. Text under a heading the spec
  does not name is read by the top's copy too. A tone rule on a short lead of technical words ("This note describes the Orders
  schema.") reads as jargon (.50 to .69). For a rule about
  the title's form (a noun phrase, not a sentence), no kind was decisive both ways: `must_not_use` and
  `should` gave .39 to .43 on a title written as a sentence and .51 to .70 on right ones, and
  `must_not_say` passed the sentence (.73 to .83). Name such checks in your report as limits.
- Meaning: a description saying only when not to use a thing ("Not for code review") reads as half of
  saying when to use it, unsure either way.
- Wording, a pattern: a space in the value and a capital inside it are missed; a leading capital and an
  underscore are caught.
- `present` on the frontmatter was unsure (.55 to .79) on two long notes that have it, and on many of
  their copies; the spec has nothing that changes it.
- **Link syntax** (`[[note]]`, not `[text](file.md)`) is markup, not words: `must_use` of the wanted form
  was unsure everywhere (.62 to .84), and naming the characters of the unwanted form unsure on right notes
  (.55 to .79). `must_not_use` of the unwanted form on the list that holds the links failed a copy using
  it (.09) and stayed unsure on right notes (.48 to .76). Read such a check as unsure.
- A rule on a frontmatter field reads only that field's value: word it so it stands on the value alone
  ("a value naming the kind of record", not "what the documented data is"). A field's exact value
  (`type: data-schema`) is not checked decisively either way (.22 to .97 over four kinds).
- Length and counts are not checked: the review does not count. A 251-character value passed "a value
  longer than 150 characters" at .59 to .71 over four reviews. Leave such a rule out of the spec.
- Tone on a part with nothing it applies to (a rule about sentences on a table) passes, at the edge of
  sure.
