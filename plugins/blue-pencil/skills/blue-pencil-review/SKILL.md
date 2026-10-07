---
name: blue-pencil-review
description: >
  Review a markdown document against its Blue Pencil spec and act on the result: fix the document,
  review again, or question a rule. Use when a spec for the document exists and the user wants the
  document checked, scored, or revised until it passes.
---

# Reviewing a document

Blue Pencil reviews a markdown document against a **spec**: the rules a good document of its kind
follows. A review returns every **check**: a value from 0 to 1, and its **outcome**, read at the two
**edges** the review states. Below the lower edge it fails, above the upper it passes: both are
**decisive**. Between them it is **borderline**, neither a pass nor a fail, and can come out otherwise
on a second review; it does not fail the document. [RESULTS.md](RESULTS.md), "A check's outcome", says
how to read one, in an older server's answer too. The `review` tool comes from the Blue Pencil MCP
server, and each call is paid. When it refuses for the user's plan, follow "When the plan refuses" in
[RESULTS.md](RESULTS.md).

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

| The session says | Review with |
|---|---|
| Blue Pencil fast mode is on | The command it gives, the document's path, the spec's path after `--spec`, and `--outcomes fail,borderline`. The script sends the file itself, saves the review's YAML beside the document, and prints a table naming that file: read the YAML from it ([RESULTS.md](RESULTS.md), "Fast mode's table") |
| Nothing of fast mode | `review`, with the document's text exactly as it is on disk, `format` `markdown`, the spec's text, and `outcomes` `[fail, borderline]`. Save the answer to a file beside the document |

Listing only the failed and borderline checks keeps the answer short; its headline still counts every
check ([RESULTS.md](RESULTS.md), "Asking for less, or more").

## 3. Decide

Read the result with [RESULTS.md](RESULTS.md). Every failed check and every borderline check gets one
decision:

| The check | Decision |
|---|---|
| Fails, and the text breaks the rule | Fix the document, as RESULTS.md's "Acting on a failed check" says |
| Borderline | Review again before acting on it; the review after your fixes is that second review |
| Borderline on two reviews | Name the part to the user as one to read themselves |
| Fails on text that is right as written | Leave the text. The rule is wrong: write down its part path, its key and why the text is right, for the `blue-pencil-spec` skill to tune. For an entry part (`<part path>.3`), the rule lives on the part above: write that path, the key, and which entry |
| Is one of the "Known limits" in [SPEC.md](../blue-pencil-spec/SPEC.md) | Name the part to the user as one to read themselves |

Done when every failed and every borderline check has its decision.

## 4. Revise, when the user wants the document fixed

1. Change the document in the part each check names.
2. Review again with the same spec, and decide again. Through `review`, when the document is long and
   you changed a few of its sections, review just those sections against a cut of the spec, as
   [FRAGMENTS.md](FRAGMENTS.md) says.

Done when a review of the whole document after your last edit has no failed check, or each check still
failing is written down with why the text is right as written; and each check borderline on two
reviews is named for the user.

## 5. Report

Tell the user, the point first: whether the document passes; what was wrong, each as the passage
quoted and the rule in plain words; what you changed; and which parts they should read themselves.
