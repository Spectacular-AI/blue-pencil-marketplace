# Tuning a spec

Read [SPEC.md](SPEC.md) and [RESULTS.md](../blue-pencil-review/RESULTS.md) first: tuning maps each check back to the field of
the spec it comes from.

Tuning makes a spec's checks decisive and **right** on example documents: a check is right when it passes
or fails as the known answer for that document says. A check is named by its part path and its key
(an entry's by the part above and the entry's position, `steps.step-list.3`)
together (`contacts.contact-table columns.required.phone`).

- **known-good**: a document of this kind that meets the goal. Every check should pass.
- **known-bad**: a copy of a known-good document with one change that should fail exactly one check.
  Every other check should come out as it did on the original, except the checks of a part the change
  removes: its status becomes `missing` or `absent`, and its own checks and the parts inside it are no
  longer listed; and a sibling's `comes: {before: <that part>}` fails too, having nothing to come before
  (0 to .26 on four of five copies; borderline, at .54, on the fifth). A rule on the parent that refers to the removed
  part ("says where the example came from") can fail too. A cascaded rule fails in the part whose own text
  breaks it, not in the parts above.
- **Adapt the known-good documents to every rule of the goal.** Examples written elsewhere rarely meet all
  of it; add what the goal requires (a section, links to related documents) to your copies, or they test
  the spec against the wrong target.

## Test documents

Find them in this order, and take the first that gives you documents:

1. **Documents of this kind the user already has**: look in the folder they pointed to.
2. **Documents that were rejected or complained about**, or that a spec let through: real known-bad
   documents, the best there are. Ask what was wrong with each.
3. **Ask the user** for three to five they are happy with.
4. **Make known-bad copies** yourself, as step 1 of the loop says.

**Hold documents back before you write or change a rule.** Pick them at random, not by which look
hardest: one in three of the known-good documents, and at least one. Read them only to make known-bad
copies of them. Tune on the rest; review the held-back documents and their copies once, at the end.
Their result is the one you report.

## What a sample can show

Tell the user what their sample can show, in their words ("with three examples I can catch a rule that
is badly wrong, not one that is wrong now and then").

| Known-good documents | A rule that wrongly fails this share of good documents shows up | The share of checks above 0.8 differs between one such sample and another by | The same sample reviewed again moves that share by |
|---|---|---|---|
| 1 | half of them: 50% of the time | 13 to 20 points | 3 points (up to 8) |
| 3 | half: 88%; one in five: 49% | 5 to 13 | 2.4 (up to 5) |
| 5 | one in three: 86%; one in ten: 41% | 3 to 9 | 1.9 (up to 4) |
| 10 | one in five: 89%; one in twenty: 40% | 3 to 6 | 1.9 (up to 3) |
| 20 | one in ten: 88%; one in twenty: 64% | 2 to 4 | 1.3 (up to 2) |
| 30 | one in ten: 96%; one in twenty: 79% | about 2 | 1.0 (up to 1.4) |

- Column 2 is arithmetic. Columns 3 and 4 were measured on 116 notes of five kinds, each reviewed five
  times; column 4 is the median, with the 90th percentile in brackets.
- **With fewer than ten documents, read checks one by one, not the share.** One check moves by a median
  of 0.01 between reviews, so a decisive check that is wrong on a known-good document is a finding even
  with one document. A change in the share smaller than columns 3 and 4 is not.

## The loop

1. **Examples.** Take the known-good documents you did not hold back ("Test documents", above). For each clause of the goal, write one known-bad copy, aimed at the check
   that checks that clause. A clause that no small change breaks ("explains its idea") still gets one:
   replace the part it concerns with text that fails it. If two such copies still pass, stop: the review
   infers the thing from the rest of the document. Count the check as wrong, and name it in your report
   as a limit of the question, not of your spec. A known-bad whose aimed check comes out borderline counts as
   right-but-borderline; a second copy that breaks the rule more plainly tells you whether the rule or
   the copy is loose. When you split a rule in two, re-aim the known-bad copy written for it, so that
   each copy still breaks one check.
2. **Expected.** In one file beside the examples, not inside them, write down for each example which
   checks should fail: none on a known-good; the aimed check on a known-bad. A label inside a document
   is sent with it and tells the review the answer.
3. **Review** every example with the same spec: one `review` call per example, with its text and the
   spec's text; or, when the session says Blue Pencil fast mode is on, the command it gives, with every
   example's path and the spec's path after `--spec`. Save each answer to a file in a folder for this pass (`reviews/pass-1`) as it returns.
4. **Table.** From each saved review's headline and metrics, list each example's checks, failed and
   borderline; start from it to see which examples to read. Then per example, per check, from its saved
   review: expected, value, outcome ([RESULTS.md](../blue-pencil-review/RESULTS.md), "A check's
   outcome"), right or not: a fail or a pass that matches the expected one is right, a borderline one is
   not decisive. Then the share of the listed checks that are both decisive and right (a missing
   part's own checks are not listed, so they are not counted).
5. **Change** the spec for each check that is borderline or wrong, by its cause (below). Record each
   change: what changed, why, and the values before and after.
6. **Review again** every example, into a new folder, since a change can move checks on
   documents it was not aimed at, and go back to step 4.

**Done** when every check is decisive and right on every example you tuned on; or when two passes in a row each raise
the share of decisive and right checks by less than 5 points over the pass before (a fall counts as less
than 5). When the set of examples changes between passes, compare the shares on the examples both passes
reviewed. If a check is waiting for its second review after coming out borderline when the stop rule is met, review that
example once more before you stop. Then review the held-back documents and their known-bad copies, once, and report their share
of checks decisive and right beside the share on the examples you tuned on: a held-back share well
below the other means the spec fits its examples, not the kind. List the checks still borderline or
wrong, each with its likely cause.

## Causes, and what to change

| What you see | Usual cause | Change |
|---|---|---|
| Borderline on several examples | The rule holds two ideas, or vague words ("clearly", "the key points") | Split it, or name the thing concretely |
| Borderline or wrong `present` | `name` is not the heading writers use, or `description` does not say what the part is for | Match `name` to the heading writers use; rewrite `description` as what the part is for |
| A part found in the wrong place, or `comes` located the wrong section | Two sections fit the part's words | Make `description` say what sets this part apart |
| A `must_say` passing on text that only implies it, or failing on text that says it | The rule leaves its boundary to the review | Say in the rule what must not count (SPEC.md, "Content rules") |
| A wording rule missing a form of the word or a mark | The rule names the word, not its forms or character | Name every form, and each mark by its character (SPEC.md, "Content rules") |
| A `should` borderline on grammar | The rule names the grammar without saying what it means | Say what it means, with an example (SPEC.md, "Content rules") |
| An `every_entry` passing a bad entry | "Only" without its boundary | State the boundary (SPEC.md, "Content rules") |
| Decisive and wrong on a known-good | The rule asks what this kind of document does not need to do, or sits on the wrong part | Reword it, move it to the part where it belongs, or turn it off |
| A cascaded rule, tone item or package item wrong on a known-good, in one part | The rule does not fit that part | Turn it off there: `{text, off: true}`, or `"off"` for the item in the part's `tone` or `packages` |
| Passes on a known-bad | No rule checks what the copy broke, or its rule is too loose to catch it | Add a rule, or make its words name the thing exactly |
| Borderline on one example | The answers are split, or it is noise: a value moves by up to about 0.10 between reviews | Change the rule only when it is borderline on two reviews: the next pass, or several examples in the same pass |

## What a spec can change

A part's `name`, `description`, `present`, `comes`, `columns` and `language`; the words of its rules, and
each rule's `cascade`, or turning it off below a part; which tone or package option is chosen; an item
turned off, or reworded, at the top or in a part; the items of a tone or package the spec declares. The questions each assertion asks, and the answers they allow, are
fixed on the server: `catalog` shows them. SPEC.md's "Known limits" are limits of those questions: name
a check that runs into one in your report, rather than tuning against it.

## Cost

Each review is paid, and costs you more than it costs the server. With fast mode on, the script sends
the files and you write only the command. Through `review`, you write the whole
document and the spec as its arguments: one pass over 47 examples of about 2,300 tokens each, with a
spec of 1,900, wrote about 200,000 tokens and read back 125,000, and five such passes cost far more than
the reviews. So:

- Save every answer to a file as it returns: a lost answer is a review paid twice.
- One known-bad per clause of the goal, not one per check; a second only as step 1 says.
- Make every change a pass of the table calls for before reviewing again, rather than one change per
  review.
- `check_spec` is free: run it after every edit.
