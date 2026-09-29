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

## What a good session gives the user

- **A document they are happy with**, or rules they trust for a kind of document.
- **Rules that hold only what they agreed to**, each one something they would say in their own words.
- **A clear account** of which of their wants the rules check, and which they must read for themselves.
- **Few decisions, each easy**: they answered from what they know about their document and its readers,
  and never had to learn how the tool works.

The spec work happens out of their sight: scores, rule wording, tuning rounds and review counts stay in
your notes and files. They see their document, what you noticed in it, and your questions.

## Talking with the user

Every message that asks the user something, the first one included, is written toward
[question.spec.yaml](question.spec.yaml), a spec for a good question. A heading is a chance to say
something, so the body need not repeat it. A **new question** has up to three short sections under H4
headings:

- **`#### Where we are: …`**, the heading going on in your own words ("Where we are: nearly there"):
  how far the work has got towards what the user wants, and what you understood from their latest message
  (their last answer, or before they have answered anything, their request);
- **`#### What I noticed: …`**, naming the thing noticed ("What I noticed: your proposal asks others
  for cost"): what raised the question, with something concrete to react to: their own words quoted, a
  small example, or two versions side by side. Leave it out when the question only asks for a go-ahead
  to take the next step;
- **the question**, usually as its own heading, in words specific to their document ("Should a
  one-pager that asks only for a first meeting still say what it will cost?"): one question, and what
  each possible answer would change.

A **quick follow-up** clarifies the user's last answer before you move on, and needs none of that: one
section, `#### Quick question: …` with the question in prose, or `#### Quick questions: …` with a short
list, saying what they said ("You said …") and what the answers will change. Keep every question in it
on that answer; the review cannot tell a stray one, so a new subject is a new question.

Write as one colleague to another, in a professional tone, in full sentences, naming each thing in full,
each section a sentence or two.

**Calibrate on the first two questions.** Before you send each of the session's first two questions,
save it to a file and review it against question.spec.yaml. Fix what fails, and keep a note of what you
fixed: every later question avoids it. After those two, write toward the spec and review a draft only
when you are unsure it meets it. [WORDS.md](WORDS.md) has the plain word for each of the tool's words.

The user answers in their own way: a reframe, a half answer, a question back. Each of these is
information. Take what it tells you, answer their question before you ask your next one, and let a
reframe change your next question rather than repeating the old one.

## The session

Five things happen, in roughly this order. Each has a finish line; how you get there is yours to choose,
and the ideas under each are starting points, not a script.

### 1. Form your reading

Read every document the user pointed to, and settle for yourself:

- the kind of document, who reads it, and **what that reader must be able to decide, believe or do
  after reading it**: for a proposal, the case it must make; for a runbook, the service restored;
- the **use**, from the table below;
- what the good ones share, or what reads wrong in this one.

| Use | Signs | What its spec settles | Test documents |
|---|---|---|---|
| One document, once | One draft; the user is about to send or publish it | The facts it must state; the claims it must not make; its wording and tone; the main point first | None: a light spec, reviewed against the draft |
| A kind people write again and again | Several documents of one kind, in loose shapes | The same, and the few parts every one of them has | The user's examples |
| An agent's output | The same headings, tables, lists or frontmatter in every document | Its parts: which must be there, their order, a table's columns, what each entry of a list holds; then what each part says | The user's examples, some held back |

Done when you can say the goal in two sentences: what the document is for, and what "good" will mean.

### 2. Agree the goal

Say your reading as the goal, in two sentences under "Where we are", and ask whether it is right. The user's answer is the
most valuable one of the session: a correction tells you what they care about that the document did
not show you.

Whenever an answer changes the goal, now or later, say the new goal back in two sentences and get a
yes before going on.

Done when the user has said yes to the goal as you last stated it.

### 3. Find what the goal leaves open

Ask what the goal leaves open, one question a message, taken from what the table says this use's spec
settles, and only what the documents do not already answer. For one document, ask what is true: the
spec can hold only the facts the user gives you.

Ideas for a question:

- a reading of yours to confirm: "Every one of these ends with a list of sources. Should a note always
  have one?";
- a passage from their own document: "'Your data remains completely safe.' Can you stand behind that?";
- two versions side by side, one with the thing and one without, asking which they would send;
- a small made-up example of the thing going wrong;
- what a good one is **not**: "Would it be wrong for the email to promise anything beyond the new date?".

When the user says they are not sure, ask once more in another form, usually two versions side by side
or a small example. If they are still unsure, decide yourself, tell them what you decided and why, and
move on.

Done when the user's answers stop adding anything: "I don't know", "you decide", or yes to whatever you
propose. A user learns the rest of what they want by seeing their document flagged.

### 4. Say what cannot be checked

Blue Pencil reads only the document and the spec, and answers each rule with one score for the part it
is written on. So it cannot check:

- a fact against a source outside the document;
- a length or a count;
- markup, such as the form of a link, or a field's exact value;
- **where** a rule that must hold item by item breaks: every term defined, every claim backed, every
  row of a table. The score says whether the part as a whole follows the rule, never which item breaks
  it, and the kind of rule decides which way it errs: a tone rule (`should`) fails on one lapse, so a
  long document fails it on a single missed term; a meaning rule (`must_say`) can let one lapse among
  many pass.

Tell the user, in a sentence or two, which of their wants fall here, before you write any rule. For an
item-by-item want, offer them a choice: keep it as a strict rule, which you will answer by reading the
document yourself whenever it fails, naming the items that break it; or leave it out, as a part they
read themselves. A failed item-by-item rule is resolved by your reading, never by reviewing again.
[SPEC.md](SPEC.md), "Known limits", has the measured list.

Done when each want of the user's is either going into the spec or has been named to them as one the
tool cannot check, with what happens to it.

### 5. Rough in, show, and let them react

Write the spec as [SPEC.md](SPEC.md) says, with the easy wins only:

1. The goal is its `description`; the kind of document its `title`.
2. Each thing the user agreed to is one rule, on the part it is about.
3. A package only for what the user agreed to: call `catalog` once, and turn off the items that do not
   fit this kind of document.
4. For one document, a **light spec**: each fact a `must_say`; one `must_not_say` against claims beyond
   those facts, naming them; a `should` for each thing the user named; no parts, unless the document
   has headings.
5. Save it to a file, and call `check_spec` until it returns the spec.

How a rule is worded, which kind it is and which part it sits on are yours to settle, by reviewing. Ask
the user only what they want.

Then review the user's own documents against the spec, reading the result with
[RESULTS.md](../blue-pencil-review/RESULTS.md). Fix the rules you can see are worded wrongly yourself.
Show the user what is left: three flags at most, each as the passage quoted and the rule in plain words,
and ask whether each flag is right.

- A flag they reject changes the spec. Review again.
- A good document that fails a rule changes the spec. Review again.
- For a kind of document with examples, test the spec as [TUNING.md](TUNING.md) says: hold documents
  back first, and tell the user what a sample of that size can show.

Done when the user has reacted to the flags, and a review after your last change flags nothing they
rejected.

## Hand over

- **One document:** revise it with the `blue-pencil-review` skill until it passes. Give the user the
  document, and name each part they should read themselves because its check stayed unsure.
- **A kind of document:** give the user the spec's path; what it checks, in five plain lines or fewer;
  what it cannot check; and how many documents it was tested on. When their own document is still at
  hand and failing, offer to revise it; on a yes, go on with the `blue-pencil-review` skill yourself.

## Tune a spec

When a spec judges wrongly, because the user brings documents that got through or good ones that were
flagged, follow [TUNING.md](TUNING.md). The documents they bring are its best test documents.
