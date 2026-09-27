---
name: blue-pencil
description: >
  Blue Pencil: review a markdown document against a spec. Use when reviewing a document, revising one
  until it passes, writing a spec for a kind of document, or tuning a spec against example documents.
---

# Blue Pencil

Blue Pencil reviews a markdown document against a **spec**: YAML naming the **parts** a document of one
kind has (sections, tables, lists, code blocks, frontmatter fields), whether each must be there and
where, and the **rules** the text in each part must follow. A review returns every **check**: a value
from 0 to 1, passing at 0.5 or above, named by its part's path and its key in the spec. The tools come
from the `blue-pencil` MCP server: `catalog`, `generate_spec` and `check_spec` are free; each `review` is
paid. The `blue-pencil-files` server gives the same `review` and `check_spec` for files on disk:
`review_files` and `check_spec_file`.

Words used throughout:

- **goal**: who reads documents of this kind, and what they can do after reading one. It is the spec's
  `description`.
- **decisive**: a check whose value is below 0.2 or above 0.8. Every other check, 0.2 and 0.8 included,
  is **unsure**: the answers behind it are split. The answers move by up to about 0.10 between identical
  reviews, so an unsure check within 0.10 of 0.5 can flip on a second review.

Every document goes with its `format`, `markdown`, the only format today. Which tool depends on where
the document is:

- **A file on disk**: `review_files`, with the spec's path and the documents' paths, globs allowed
  (`bad/*.md`). It reads the files, sends their text to `review`, and returns each review's YAML as
  `review` answers it, then a table per document. Its paths are inside the folder the session started
  in, which its description names. `check_spec_file` checks a spec file the same way.
- **Text only in the conversation** (pasted, or not saved): `review`, with the document and the spec's
  YAML as text. `check_spec` takes the spec as text.

## Review a document

1. Take the spec the user names. With none, review without one: the review generates a spec from the
   document's headings and returns it at the end; save it if the document will be reviewed again.
2. Call `review_files` with the document's path and the spec's path, or `review` with their text.
3. Read the result with [RESULTS.md](RESULTS.md) the first time in a session.
4. Report the headline (pass, checks, failed), then every failed check and every unsure check: its part
   path, its key, and what its answers say.

Done when every failed and every unsure check is reported by its part path and key.

## Revise a document until it passes

1. Review it, as above.
2. For each failed check, change the document in the part its path names, as RESULTS.md's "Acting on a
   failed check" says for its key and likeliest answer.
3. Review again with the same spec, and go back to step 2.
4. When a check fails on text you judge right as written, leave the text and write down the check's
   part path, key and why the text is right.

Done when a review after your last edit passes every check, or each check still failing is written down
with why the text is right as written.

## Write a spec from a goal

Read [SPEC.md](SPEC.md) first, and call `catalog` once.

1. Write the goal as `description`, and the kind of document as `title`.
2. Split the goal, and every rule the user gives, into clauses, each one thing a good document of this
   kind has, says or avoids.
3. Start the parts from an example document with `generate_spec`, or write them yourself. Keep the parts
   every document of this kind has, and the parts a clause names: an optional, conditional or forbidden
   part is a part too.
4. Give each clause its assertion on the part it is about: one of the part's own fields when the clause
   is about whether the part is there, where it comes, a table's columns or a code block's language; an
   `asserts` rule when it is about what the part's text says, which words it uses, how it reads, or what
   every entry of a list does. A clause about the whole document goes in the top's `asserts`, and so
   does one about the title or the lead, with the limit SPEC.md's "Known limits" gives.
5. Choose packages from `catalog` only where the goal or the writers' house style calls for them, and
   turn off the items that do not fit this kind of document. A package item the known-good documents
   do not follow fails every one of them.
6. Save the spec to a file and call `check_spec_file` on it; fix the field at the path it names; repeat
   until it returns the spec.

Done when the check returns the spec and every clause has its assertion on the part it is about.

## Tune a spec

A spec is tuned against example documents whose right answers are known, until its checks are decisive
and right. Follow the loop in [TUNING.md](TUNING.md); it says when you are done.
