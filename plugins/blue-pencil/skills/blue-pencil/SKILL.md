---
name: blue-pencil
description: >
  Blue Pencil: review a markdown document against a spec. Use when reviewing a document, revising one
  until it passes, writing a spec for a kind of document, or tuning a spec against example documents.
---

# Blue Pencil

Blue Pencil reviews a markdown document against a **spec**: YAML naming the document's sections, what
each must say, and the writing packages to check. A review returns every **check**: a value from 0 to 1,
passing at 0.5 or above, named by its key in the spec. The tools come from the `blue-pencil` MCP server:
`catalog`, `generate_spec` and `check_spec` are free; each `review` is paid.

Words used throughout:

- **goal**: who reads documents of this kind, and what they can do after reading one. It is the spec's
  `description`.
- **decisive**: a check whose value is below 0.2 or above 0.8. Every other check, 0.2 and 0.8 included,
  is **unsure**: the answers behind it are split. The answers move by up to about 0.10 between identical
  reviews, so an unsure check within 0.10 of 0.5 can flip on a second review.

The server cannot read your files: send the document and the spec as text in each call, with the
document's `format`, `markdown`, the only format today.

## Review a document

1. Take the spec the user names. With none, review without one: the review generates a spec from the
   document's headings and returns it at the end; save it if the document will be reviewed again.
2. Call `review` with the document and the spec's YAML.
3. Read the result with [RESULTS.md](RESULTS.md) the first time in a session.
4. Report the headline (pass, checks, failed), then every failed check and every unsure check: its
   section path, its key, and what its answers say.

Done when every failed and every unsure check is reported by its section path and key.

## Revise a document until it passes

1. Review it, as above.
2. For each failed check, change the document in the part its section path names, as its likeliest
   answer asks: `missing`, add it; `partly`, complete it; `contained`, take it out; `no section` or a
   failed presence, add the part or give it the heading the spec names; `mostly against` or
   `a few lapses`, rewrite the part to follow the item.
3. Review again with the same spec, and go back to step 2.
4. When a check fails on text you judge right as written, leave the text and write down the check's key
   and why the text is right.

Done when a review after your last edit passes every check, or each check still failing is written down
with why the text is right as written.

## Write a spec from a goal

Read [SPEC.md](SPEC.md) first.

1. Write the goal as `description`, and the kind of document as `title`.
2. Split the goal into clauses, each one thing a good document of this kind says or does.
3. Start the sections from an example document with `generate_spec`, keeping only the sections every
   document of this kind has; or write them yourself.
4. Give each clause an `asserts` line, in the section where a reader would look for it, or at the top
   for the whole document. Make a section `required` when every document of this kind needs it.
5. Choose packages from `catalog` only where the goal or the writers' house style calls for them, and
   turn off the items that do not fit this kind of document. A package item the known-good documents
   do not follow fails every one of them.
6. Call `check_spec`; fix the field at the path it names; repeat until it returns the spec.

Done when `check_spec` returns the spec and every clause of the goal has at least one `asserts` line.

## Tune a spec

A spec is tuned against example documents whose right answers are known, until its checks are decisive
and right. Follow the loop in [TUNING.md](TUNING.md); it says when you are done.
