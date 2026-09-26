# Tuning a spec

Read [SPEC.md](SPEC.md) and [RESULTS.md](RESULTS.md) first: tuning maps each check back to the field of
the spec it comes from.

Tuning makes a spec's checks decisive and **right** on example documents: a check is right when it passes
or fails as the known answer for that document says.

- **known-good**: a document of this kind that meets the goal. Every check should pass.
- **known-bad**: a copy of a known-good document with one change that should fail exactly one check key.
  Every other check should come out as it did on the original, except the checks of a section the change
  removes: that section's status becomes `missing` or `absent`, and its own checks are no longer listed.
  A top-level line about that section fails too unless it is worded to pass when the section is absent
  ("below the change log, …" passes when there is none); word it so, or expect both failures.
- **Adapt the known-good documents to every rule of the goal.** Examples written elsewhere rarely meet all
  of it; add what the goal requires (a section, links to related documents) to your copies, or they test
  the spec against the wrong target.

## The loop

1. **Examples.** Take at least two known-good documents from the user or the task; ask for them when
   there are none. For each clause of the goal, write at least one known-bad copy, aimed at the check key
   that checks that clause. A clause that no small change breaks ("explains its idea") still gets one:
   replace the part it concerns with text that fails it. If two such copies still pass, stop: the review
   infers the thing from the rest of the document. Count the check as wrong, and name it in your report
   as a limit of the question, not of your spec. A known-bad that fails but stays unsure counts as
   right-but-unsure; a second copy that breaks the rule more plainly tells you whether the line or the
   copy is loose. When you split a line in two, re-aim the known-bad copy
   written for it, so that each copy still breaks one key.
2. **Expected.** In one file beside the examples, not inside them, write down for each example which
   check keys should fail: none on a known-good; the aimed key on a known-bad. A label inside a document
   is sent with it and tells the review the answer.
3. **Review** every example with the same spec.
4. **Table.** Per example, per check key: expected, value, decisive or not, right or not. Then the share
   of the listed checks that are both decisive and right (a missing section's own checks are not listed,
   so they are not counted).
5. **Change** the spec for each check that is unsure or wrong, by its cause (below). Record each change:
   what changed, why, and the values before and after.
6. **Review again** every example, since a change can move checks on documents it was not aimed at, and
   go back to step 4.

**Done** when every check is decisive and right on every example; or when two passes in a row each raise
the share of decisive and right checks by less than 5 points over the pass before (a fall counts as less
than 5). When the set of examples changes between passes, compare the shares on the examples both passes
reviewed. If a check is waiting for its second close review when the stop rule is met, review that
example once more before you stop. Then list the checks still unsure or wrong,
each with its likely cause.

## Causes, and what to change

| What you see | Usual cause | Change |
|---|---|---|
| Unsure on several examples | The line holds two ideas, or vague words ("clearly", "the key points") | Split it, or name the thing concretely |
| Unsure presence, or `no section` answers | The `description` does not say where the part is, or `name` does not match the headings used | Rewrite the description as where the part is; match `name` to the heading writers use |
| Decisive and wrong on a known-good | The line asks what this kind of document does not need to do | Reword it, move it to the section where it belongs, or turn it off |
| A package item wrong on a known-good | The item does not fit this kind of document, or one of its sections | `"off"` at the top, or in that section's `packages` |
| Passes on a known-bad | No line checks the broken rule, or its line is too loose to catch it | Add a line, or make its words name the rule exactly |
| Within 0.10 of 0.5 | The answers are split, or it is noise | Change the line only when it is this close on two reviews: the next pass, or several examples in the same pass |

## What a spec can change

A section's `name`, `description` and `present`; the words of its `asserts` lines; which package option
is chosen; an item turned off, or reworded (`items: {<item>: new wording}`, at the top or in a section).
The questions each kind asks, and the answers they allow, are fixed on the server: `catalog` shows them.

## Cost

Each `review` is paid. Make every change a pass of the table calls for before reviewing again, rather
than one change per review. `check_spec` is free: run it after every edit.
