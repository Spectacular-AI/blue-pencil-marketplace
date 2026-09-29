---
name: blue-pencil-spec
description: >
  Define with a user what a good document of theirs is, and write it as a Blue Pencil spec. Use when a
  user wants a document, or a kind of document, less sloppy or good every time and no spec for it
  exists; when they ask for a spec; or when a spec judges documents wrongly and needs tuning.
---

# Defining a good document

A user who wants a document less sloppy can rarely say what a good one is. They recognise it when
they see it. So you go first: read what they gave you, say your **reading** of it, and let them react.
What the two of you settle becomes a **spec**: the rules Blue Pencil reviews a document against
([SPEC.md](SPEC.md)). A spec puts a number on the goal, so write one even for a single document, before
the document's final draft.

The tools come from the Blue Pencil MCP server: `catalog`, `generate_spec` and `check_spec` are free;
each `review` is paid. When a tool is missing or refuses for the user's plan, follow "When the plan
refuses" in [RESULTS.md](../blue-pencil-review/RESULTS.md).

Every message to the user follows [WORDS.md](WORDS.md): their words, never the tool's.

## 1. Read, and form your reading

Read every document the user pointed to. Settle for yourself:

- the kind of document, who reads it, and what that reader does after reading it;
- the **use**, from the table below;
- what the good ones share, or what reads wrong in this one.

| Use | Signs | What its spec settles | Test documents |
|---|---|---|---|
| One document, once | One draft; the user is about to send or publish it | The facts it must state; the claims it must not make; its wording and tone; the main point first | None: a light spec, reviewed against the draft |
| A kind people write again and again | Several documents of one kind, in loose shapes | The same, and the few parts every one of them has | The user's examples |
| An agent's output | The same headings, tables, lists or frontmatter in every document | Its parts: which must be there, their order, a table's columns, what each entry of a list holds; then what each part says | The user's examples, some held back |

Done when you can say the objective in two sentences.

## 2. Confirm the objective

Your first message to the user is the **objective** and nothing else: two sentences at most, saying
what you take the document to be for and what "good" will mean, ending in a question they can answer
with "yes" or a correction.

> These read as research write-ups a teammate uses to make a decision without redoing the work. I'd
> take "good" to mean a reader can always tell where each claim came from and what was left unchecked.
> Is that right?

Done when the user has said yes, or corrected you and said yes to your corrected objective.

## 3. Peel back

Ask what the objective leaves open, **one question a message**, each one answerable in a sentence:

- a reading of yours to confirm ("Every one of these ends with a list of sources. Must a note have one?");
- a choice between two ("Which would you send: the one that opens with the date, or with the apology?");
- a passage from their own document ("'Your data remains completely safe.' Can you stand behind that?");
- what a good one is **not** ("Would it be wrong for the email to promise anything beyond the new date?").

Take the questions from what the table says this use's spec settles, and ask only what the documents
do not already answer. For one document, ask what is true: the spec can hold only the facts the user
gives you.

After every three or four answers, say back what you have so far in three lines or fewer.

Done when the user's answers stop adding anything: "I don't know", "you decide", or yes to whatever
you propose. That is good enough. A user learns the rest of what they want by seeing something.

## 4. Say what cannot be checked

Tell the user, in a sentence or two, which of their wants Blue Pencil cannot check, and write no rule
for those. It cannot check:

- a fact against a source outside the document: it reads only the document and the spec;
- a length or a count;
- a rule that must hold for every claim, or every row of a table, one by one: it reads the part as a
  whole, so one lapse among many passes;
- markup, such as the form of a link, or a field's exact value.

[SPEC.md](SPEC.md), "Known limits", has the measured list.

Done when each want of the user's is either going into the spec or has been named to them as unchecked.

## 5. Rough in

Write the spec as [SPEC.md](SPEC.md) says, with the easy wins only:

1. The objective is its `description`; the kind of document its `title`.
2. Each thing the user agreed to is one rule, on the part it is about.
3. A package only for what the user agreed to: call `catalog` once, and turn off the items that do not
   fit this kind of document.
4. For one document, a **light spec**: each fact a `must_say`; one `must_not_say` against claims beyond
   those facts, naming them; a `should` for each thing the user named; no parts, unless the document
   has headings.
5. Save it to a file, and call `check_spec` until it returns the spec.

How a rule is worded, which kind it is and which part it sits on are yours to settle, by reviewing.
Ask the user only what they want.

Done when `check_spec` returns the spec and every agreed thing has its rule.

## 6. Show, and let them react

Review the user's own documents against the spec, reading the result with
[RESULTS.md](../blue-pencil-review/RESULTS.md). Then show the user what it flags: three flags at most,
each as the passage quoted and the rule in plain words, and ask whether each flag is right.

- A flag they reject changes the spec. Review again.
- A good document that fails a rule changes the spec. Review again.
- For a kind of document with examples, test the spec as [TUNING.md](TUNING.md) says: hold documents
  back first, and tell the user what a sample of that size can show.

Done when the user has reacted to the flags, and a review after your last change flags nothing they
rejected.

## 7. Hand over

- **One document:** revise it with the `blue-pencil-review` skill until it passes. Give the user the
  document, and name each part they should read themselves because its check stayed unsure.
- **A kind of document:** give the user the spec's path; what it checks, in five plain lines or fewer;
  what it cannot check; and how many documents it was tested on.

## Tune a spec

When a spec judges wrongly, because the user brings documents that got through or good ones that were
flagged, follow [TUNING.md](TUNING.md). The documents they bring are its best test documents.
