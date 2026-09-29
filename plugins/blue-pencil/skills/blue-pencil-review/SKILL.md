---
name: blue-pencil-review
description: >
  Review a markdown document against its Blue Pencil spec and act on the result: fix the document,
  review again, or question a rule. Use when a spec for the document exists and the user wants the
  document checked, scored, or revised until it passes.
---

# Reviewing a document

Blue Pencil reviews a markdown document against a **spec**: the rules a good document of its kind
follows. A review returns every **check**: a value from 0 to 1, passing above 0.5. A check below 0.2 or
above 0.8 is **decisive**; every other check is **unsure**, and one within 0.10 of 0.5 can flip on a
second review. The `review` tool comes from the Blue Pencil MCP server, and each call is paid. When
it refuses for the user's plan, follow "When the plan refuses" in [RESULTS.md](RESULTS.md).

Every message to the user follows [WORDS.md](../blue-pencil-spec/WORDS.md): their words, never the
tool's. A question to the user is written toward
[question.spec.yaml](../blue-pencil-spec/question.spec.yaml).

## 1. Find the spec

| The document has | Do |
|---|---|
| A spec the user named, or a spec file kept with it | Use it |
| No spec | Define one first, with the `blue-pencil-spec` skill; then come back |
| No spec, headings, and the user wants only a first look | Review without a spec: the review builds one from the headings and returns it. Tell the user that is all it checked |

Done when you hold a spec's text, or have chosen the first look.

## 2. Review

Call `review` with the document's text exactly as it is on disk, `format` `markdown`, and the spec's
text. Save the answer to a file beside the document.

## 3. Decide

Read the result with [RESULTS.md](RESULTS.md). Every failed check and every unsure check gets one
decision:

| The check | Decision |
|---|---|
| Fails decisively, and the text breaks the rule | Fix the document, as RESULTS.md's "Acting on a failed check" says |
| Within 0.10 of 0.5 | Review again before acting on it |
| Unsure on both reviews | Name the part to the user as one to read themselves |
| Fails on text that is right as written | Leave the text. The rule is wrong: write down its part path, its key and why the text is right, for the `blue-pencil-spec` skill to tune |
| Is one of the "Known limits" in [SPEC.md](../blue-pencil-spec/SPEC.md) | Name the part to the user as one to read themselves |

Done when every failed and every unsure check has its decision.

## 4. Revise, when the user wants the document fixed

1. Change the document in the part each check names.
2. Review again with the same spec, and decide again.

Done when a review after your last edit passes every check, or each check still failing is written
down with why the text is right as written.

## 5. Report

Tell the user, the point first: whether the document passes; what was wrong, each as the passage
quoted and the rule in plain words; what you changed; and which parts they should read themselves.
