# Reading a review

A review is YAML: a headline, the edges its checks were read at, a score per metric, then every part by
its part path, each check by its key in the spec ([SPEC.md](../blue-pencil-spec/SPEC.md), "Paths and
keys"). An excerpt of a review against SPEC.md's example spec, every failed and borderline check shown
and some passed ones left out:

```yaml
review: {pass: false, score: 0.71, checks: 23, failed: 5, borderline: 2, passed: 16, ms: 1840}
strictness: {level: standard, fail: 0.4, pass: 0.8}  # each check fails below 0.4, passes above 0.8, and is borderline from 0.4 to 0.8
metrics:  # score; then how many checks failed, were borderline and passed
  parts: {score: 0.74, failed: 2, borderline: 1, passed: 5}
  meaning: {score: 0.61, failed: 1, borderline: 1, passed: 2}
  wording: {score: 0.9, failed: 1, borderline: 0, passed: 8}
  tone: {score: 0.71, failed: 1, borderline: 0, passed: 1}
parts:  # by spec path; its checks under failed, borderline and passed, each by its spec key, a cascaded copy after the path it was written on: value; then every answer
  whole_document:  # the whole document: the spec's top-level asserts, tone and packages
    passed:
      asserts.must_use.0: 0.97; used 0.97, not used 0.03
  frontmatter:
    borderline:
      present: 0.62; found 0.62, not found 0.38
  frontmatter.owner:
    failed:
      asserts.must_say.0: 0.31; not stated 0.69, stated 0.31
  steps:
    failed:
      asserts.should.0: 0.05; mostly against 0.95, follows 0.05, a few lapses 0
      whole_document.asserts.must_not_use.0: 0.08; used 0.92, not used 0.08
    passed:
      present: 0.98; found 0.98, not found 0.02
  steps.step-list.1:
    passed:
      steps.step-list.asserts.every_entry.0: 0.93; followed 0.93, not followed 0.07
  steps.step-list.2:
    borderline:
      steps.step-list.asserts.every_entry.0: 0.66; followed 0.66, not followed 0.34
  steps.restart:
    failed:
      language: 0.1; another 0.9, names it 0.1
  rollback:
    status: absent
    passed:
      present.when: 0.88; does not hold 0.88, holds 0.12
  contacts:
    passed:
      comes: 0.95; Contacts 0.95, Steps 0.03, none 0.02
  contacts.contact-table:
    passed:
      columns.required.phone: 0.93; the table in "Contacts" 0.95, none 0.05; phone 0.93, other 0.07
  internal-notes:
    failed:
      present: 0.08; found 0.92, not found 0.08
```

## The headline, the edges and the metrics

- `review`: `pass`, true when no check failed, a borderline one included; `score`, the document score,
  the mean of every check's value, each weighted by its rule's `weight` in the spec (1 unless written;
  [SPEC.md](../blue-pencil-spec/SPEC.md)); how many checks ran; how many `failed`, were `borderline`
  and `passed`; how long it took. A review with no checks scores 1.
- `strictness`: the review's two **edges**, named by their level, and the comment after them says how
  to read them.
- `metrics`: one line per kind of check (`parts` for the container assertions, `meaning`, `wording`,
  `tone`): its mean value, weighted as the document score is, and how many of its checks failed, were
  borderline and passed.

## A check's outcome

Every check has one **outcome**, its value read at the edges on the `strictness` line (Standard's are
0.4 and 0.8):

| Outcome | Value | Means |
|---|---|---|
| `fail` | below the `fail` edge | The answers agree the part breaks the rule |
| `borderline` | from the `fail` edge to the `pass` edge, both included | Neither a pass nor a fail: the review cannot call it |
| `pass` | above the `pass` edge | The answers agree the part meets the rule |

- A fail or a pass is **decisive**. A borderline check is not a call either way: a value moves by up to
  about 0.10 between identical reviews, so one review in the middle is not trusted. It does not fail the
  document.
- The group a check is listed under, `failed`, `borderline` or `passed`, is its outcome. A value written
  as 0.4 or 0.8 is rounded, and can sit on either side of the edge: its group says which.
- Read a value against the edges the answer states, and those alone: 0.5 is not an edge.
- The outcome is the value's alone. How likely the likeliest answer looks, or a confidence another tool
  shows, never moves a check across an edge.
- `catalog` lists the three outcomes, by their codes with their words, under `outcomes`.

## A check's line

`<key>: <value>; <answers>`. The higher the value, the more the answers lean towards a pass. Then each
question the check asked, separated by `;`, its answers likeliest first, each with its probability.
`catalog` lists each assertion's questions (`question`, then `also`) and each yes/no or graded
question's `labels`, worst first. A choice's answers are the document's own section headings or
columns, or `none` and `other`: `comes` locates the section, and for `before` its sibling, and passes
when the tree puts them in that order; a column check locates the table, then matches each of its
columns to the names the spec gives, one answer group per column of the table, in its order. A check
read from several answers takes the least certain of them.

Within a part, `failed` comes first, then `borderline`, then `passed`, each lowest first. The rule's
words are not repeated: look them up in the spec by the part path and key. A checked part with no checks
is left out; a part with any other status is always listed, with its `status`.

## An answer from an older server

Until the server is updated, `review` may answer in its older shape, with no `strictness` line:

```yaml
review: {pass: false, score: 0.71, checks: 23, failed: 5, ms: 1840}
metrics:  # score; bands: sure_fail < 0.2 <= borderline <= 0.8 < sure_pass
  meaning: {score: 0.61, failed: 1, sure_fail: 0, borderline: 2, sure_pass: 2}
```

Its edges are the bands its `metrics` comment names, 0.2 and 0.8: below 0.2 is a fail (`sure_fail`),
0.2 to 0.8 borderline (`borderline`), above 0.8 a pass (`sure_pass`). Its `failed` and `passed` groups,
the headline's `pass` and `failed`, and each metric's `failed` split the checks at 0.5 instead, so a
check listed under `failed` at 0.31, or under `passed` at 0.62, is borderline. Read each check's
outcome from its value at 0.2 and 0.8, as the table above does at the stated edges; the document has no
failed check when no value is below 0.2. An older `catalog` lists the bands under `bands`.

## A part's status

Written only when it is not `checked`:

| Status | Means | Its own checks |
|---|---|---|
| `checked` | Found, or the whole document | Listed, with no `present` check when the part is optional or conditional; a `forbidden` part found lists only its `present`, failed or borderline |
| `missing` | Not found, where it should be: it is required, or one of its conditions holds | Only its `present` or `present.when`, failed or borderline |
| `absent` | Not found, and that is fine: it is optional or forbidden, or none of its conditions holds | Only its `present` or `present.when`, passed or borderline; an optional part's, none |
| `skipped` | Its parent was not found, so it was never looked for | None |
| `unlocated` | Found, but the review could not say which list it is, so its per-entry rules were not asked; or a part another rule reads was found but not placed | Its `present`; no entry parts |

An **entry part**, `type: entry`, sits under a part with per-entry rules, one per item of a list or
child section of a section, at `<part path>.<n>`: it is always `checked`, and its checks are keyed by
the rule on the part above.

The parts inside a part that is not found, or is found but forbidden, are `skipped`.

Whether a part is found, and whether a condition holds, is the review's own yes or no, taken at 0.5 so
it knows what to check next; the part's `present` check is then read at the edges like any other. So
a part found at 0.62 is `checked`, its rules asked, while its `present` is borderline, as `frontmatter`
is above.

## Acting on a failed check

Change the document in the part the path names, as the check's key and likeliest answer say:

| Key | Likeliest answer | Change |
|---|---|---|
| `present` on a required part | `not found` | Add the part, under the heading its `name` gives, holding what its `description` says, inside its parent |
| `present` on a forbidden part | `found` | Take the part out |
| `present.when` | `holds` | A condition holds, so add the part |
| `comes` | the headings located | Move the section to where `comes` says |
| `columns.required.<name>` | `other`, or the table `none` | Add the column, or the table |
| `columns.forbidden.<name>`, `columns.only` | the column named | Take out the columns the spec does not allow |
| `language` | `another` | Name the language after the opening fence |
| `asserts.must_say.<n>` | `not stated` | State it outright in this part |
| `asserts.must_not_say.<n>` | `stated` | Take it out of this part |
| `<part path>.asserts.every_entry.<n>`, under an entry part | `not followed` | Fix this entry; the check names it |
| `asserts.must_use.<n>` | `not used` | Use the word in this part |
| `asserts.must_not_use.<n>`, a banned-words item | `used` | Take the word out of this part's own text |
| `asserts.should.<n>`, a `tone.<item>` or structure item | `mostly against`, `a few lapses` | Rewrite this part to follow the rule |

A check that ends `reads <path> (<label>)` compares this part with the part it read: fix whichever of
the two the rule's likeliest answer points to, often the part read (add the step, the test). A rule
listed under `unasked` was not asked because a part it reads is `missing`, `absent` or `unlocated`, as
its line says: add that part, and the rule is asked on the next review.

A cascaded copy (`<path>.asserts.…`) is fixed in the part it is listed under, in that part's own text:
the parts inside it are checked by their own copies. The rule itself is written on the part at
`<path>`.

## When to trust a value

Act on a decisive check. A borderline one is not a call: review again before acting on it, and when it
stays borderline, read the part against the rule yourself.

## The spec it used

When the review generated the spec, the YAML ends with it as `spec: |`, with two comment lines showing
where `title` and `description` go. When you sent a spec, it is not repeated.

## Errors

`error: {code, message}`, with the tool's error flag set:

| Code | Means | Do |
|---|---|---|
| `plan_required` | A spec was sent on Basic, whose reviews use the generated spec | "When the plan refuses", below |
| `spec_invalid` | A field of the spec is wrong; `path` names it | Fix that field; `check_spec` finds these for free |
| `request_invalid` | The call itself is malformed; `path` may name the argument | Fix the call |
| `document_too_large` | The document is over the size limit; `limit` and `estimate` are in tokens | Review it in parts, as [FRAGMENTS.md](FRAGMENTS.md) says |
| `review_failed` | The review did not finish | Try once more |

An argument that is missing or of the wrong type (no `format`, a spec sent as an object, not YAML text) is
refused before the tool runs, with the error flag set and a plain-text message naming the argument: fix
that argument and call again.

## When the plan refuses

The user's plan decides the tools. On **Basic** the server offers `review` alone, against the spec it
generates from the document's headings; `catalog`, `generate_spec` and `check_spec` are not offered, and
a spec sent to `review` is refused with `plan_required`. Their own rules need **Premium**, or a team
on Team Premium.

1. Tell the user what you could not do, in their words, and that Premium adds it:
   https://slop-or-not.ai/pricing
2. Go on with what the plan allows: a review without a spec, for a document that has headings.
3. Keep any rules the two of you settled in a file, ready for when they upgrade.
