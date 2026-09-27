# Tuning a spec

Read [SPEC.md](SPEC.md) and [RESULTS.md](RESULTS.md) first: tuning maps each check back to the field of
the spec it comes from.

Tuning makes a spec's checks decisive and **right** on example documents: a check is right when it passes
or fails as the known answer for that document says. A check is named by its part path and its key
together (`contacts.contact-table columns.required.phone`).

- **known-good**: a document of this kind that meets the goal. Every check should pass.
- **known-bad**: a copy of a known-good document with one change that should fail exactly one check.
  Every other check should come out as it did on the original, except the checks of a part the change
  removes: its status becomes `missing` or `absent`, and its own checks and the parts inside it are no
  longer listed; and a sibling's `comes: {before: <that part>}` fails too, having nothing to come before
  (0 to .26 on four of five copies, .54 on the fifth). A cascaded rule fails in the part whose own text
  breaks it, not in the parts above.
- **Adapt the known-good documents to every rule of the goal.** Examples written elsewhere rarely meet all
  of it; add what the goal requires (a section, links to related documents) to your copies, or they test
  the spec against the wrong target.

## The loop

1. **Examples.** Take at least two known-good documents from the user or the task; ask for them when
   there are none. For each clause of the goal, write one known-bad copy, aimed at the check
   that checks that clause. A clause that no small change breaks ("explains its idea") still gets one:
   replace the part it concerns with text that fails it. If two such copies still pass, stop: the review
   infers the thing from the rest of the document. Count the check as wrong, and name it in your report
   as a limit of the question, not of your spec. A known-bad that fails but stays unsure counts as
   right-but-unsure; a second copy that breaks the rule more plainly tells you whether the rule or the
   copy is loose. When you split a rule in two, re-aim the known-bad copy written for it, so that each
   copy still breaks one check.
2. **Expected.** In one file beside the examples, not inside them, write down for each example which
   checks should fail: none on a known-good; the aimed check on a known-bad. A label inside a document
   is sent with it and tells the review the answer.
3. **Review** every example with the same spec.
4. **Table.** Per example, per check: expected, value, decisive or not, right or not. Then the share of
   the listed checks that are both decisive and right (a missing part's own checks are not listed, so
   they are not counted).
5. **Change** the spec for each check that is unsure or wrong, by its cause (below). Record each change:
   what changed, why, and the values before and after.
6. **Review again** every example, since a change can move checks on documents it was not aimed at, and
   go back to step 4.

**Done** when every check is decisive and right on every example; or when two passes in a row each raise
the share of decisive and right checks by less than 5 points over the pass before (a fall counts as less
than 5). When the set of examples changes between passes, compare the shares on the examples both passes
reviewed. If a check is waiting for its second close review when the stop rule is met, review that
example once more before you stop. Then list the checks still unsure or wrong, each with its likely
cause.

## Causes, and what to change

| What you see | Usual cause | Change |
|---|---|---|
| Unsure on several examples | The rule holds two ideas, or vague words ("clearly", "the key points") | Split it, or name the thing concretely |
| Unsure or wrong `present` | `name` is not the heading writers use, or `description` does not say what the part is for | Match `name` to the heading writers use; rewrite `description` as what the part is for |
| A part found in the wrong place, or `comes` located the wrong section | Two sections fit the part's words | Make `description` say what sets this part apart |
| A `must_say` passing on text that only implies it, or failing on text that says it | The rule leaves its boundary to the review | Say in the rule what must not count (SPEC.md, "Content rules") |
| A wording rule missing a form of the word or a mark | The rule names the word, not its forms or character | Name every form, and each mark by its character (SPEC.md, "Content rules") |
| A `should` unsure on grammar | The rule names the grammar without saying what it means | Say what it means, with an example (SPEC.md, "Content rules") |
| An `every_entry` passing a bad entry | "Only" without its boundary | State the boundary (SPEC.md, "Content rules") |
| Decisive and wrong on a known-good | The rule asks what this kind of document does not need to do, or sits on the wrong part | Reword it, move it to the part where it belongs, or turn it off |
| A cascaded rule or package item wrong on a known-good, in one part | The rule does not fit that part | Turn it off there: `{text, off: true}`, or `"off"` in the part's `packages` |
| Passes on a known-bad | No rule checks what the copy broke, or its rule is too loose to catch it | Add a rule, or make its words name the thing exactly |
| Within 0.10 of 0.5 | The answers are split, or it is noise | Change the rule only when it is this close on two reviews: the next pass, or several examples in the same pass |

## What a spec can change

A part's `name`, `description`, `present`, `comes`, `columns` and `language`; the words of its rules, and
each rule's `cascade`, or turning it off below a part; which package option is chosen; an item turned off,
or reworded, at the top or in a part. The questions each assertion asks, and the answers they allow, are
fixed on the server: `catalog` shows them. SPEC.md's "Known limits" are limits of those questions: name
a check that runs into one in your report, rather than tuning against it.

## Cost

Each `review` is paid, and costs you more than it costs the server: you write the whole document and the
spec as its arguments, and read back every check. One pass over 47 examples of about 2,300 tokens each,
with a spec of 1,900, wrote about 200,000 tokens and read back 125,000; five such passes cost far more
than the reviews. So:

- One known-bad per clause of the goal, not one per check; a second only as step 1 says.
- Make every change a pass of the table calls for before reviewing again, rather than one change per
  review.
- Save each review's answer to a file as soon as it returns; a lost answer is a review paid twice.
- `check_spec` is free: run it after every edit.
