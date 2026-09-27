# Reading a review

A review is YAML: a headline, a score per metric, then every part by its part path, each check by its
key in the spec ([SPEC.md](SPEC.md), "Paths and keys"). An excerpt of a review against SPEC.md's example
spec, every failed check shown and some passed ones left out:

```yaml
review: {pass: false, checks: 23, failed: 5, ms: 1840}
metrics:  # score; bands: sure_fail < 0.2 <= unsure <= 0.8 < sure_pass
  parts: {score: 0.74, failed: 2, sure_fail: 2, unsure: 0, sure_pass: 6}
  meaning: {score: 0.61, failed: 1, sure_fail: 0, unsure: 2, sure_pass: 2}
  wording: {score: 0.9, failed: 1, sure_fail: 1, unsure: 0, sure_pass: 8}
  tone: {score: 0.71, failed: 1, sure_fail: 1, unsure: 0, sure_pass: 1}
parts:  # by spec path; each check by its spec key, a cascaded copy after the path it was written on: value; then every answer
  whole_document:  # the whole document: the spec's top-level asserts and packages
    passed:
      asserts.must_use.0: 0.97; used 0.97, not used 0.03
  frontmatter.owner:
    failed:
      asserts.must_say.0: 0.31; not stated 0.69, stated 0.31
  steps:
    failed:
      asserts.should.0: 0.05; mostly against 0.95, follows 0.05, a few lapses 0
      whole_document.asserts.must_not_use.0: 0.08; used 0.92, not used 0.08
    passed:
      present: 0.98; found 0.98, not found 0.02
  steps.step-list:
    passed:
      asserts.every_entry.0: 0.91; every entry 0.91, not every entry 0.09
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

## The headline and metrics

- `review`: whether every check passed, how many checks ran, how many failed, how long it took.
- `metrics`: one line per kind of check (`parts` for the container assertions, `meaning`, `wording`,
  `tone`): its mean value, how many failed, and how many were decisive fails (`sure_fail`), unsure, and
  decisive passes (`sure_pass`).

## A check's line

`<key>: <value>; <answers>`. The higher the value, the more the answers lean towards a pass. Then each
question the check asked, separated by `;`, its answers likeliest first, each with its probability.
`catalog` lists each assertion's questions (`question`, then `also`) and each yes/no or graded
question's `labels`, worst first. A choice's answers are the document's own section headings or
columns, or `none` and `other`: `comes` locates the section, and for `before` its sibling, and passes
when the tree puts them in that order; a column check locates the table, then matches each of its
columns to the names the spec gives, one answer group per column of the table, in its order. A check
read from several answers takes the least certain of them.

Within a part, `failed` comes before `passed`, each lowest first. The rule's words are not repeated:
look them up in the spec by the part path and key. A checked part with no checks is left out; a part
with any other status is always listed, with its `status`.

## A part's status

Written only when it is not `checked`:

| Status | Means | Its own checks |
|---|---|---|
| `checked` | Found, or the whole document | Listed, with no `present` check when the part is optional or conditional; a `forbidden` part found lists only its failed `present` |
| `missing` | Not found, and that fails: it is required, or one of its conditions holds | Only its failed `present` or `present.when` |
| `absent` | Not found, and that is fine: it is optional or forbidden, or none of its conditions holds | Only a passed `present` or `present.when`; an optional part's, none |
| `skipped` | Its parent was not found, so it was never looked for | None |

The parts inside a part that is not found, or is found but forbidden, are `skipped`.

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
| `asserts.every_entry.<n>` | `not every entry` | Fix each entry that breaks the rule |
| `asserts.must_use.<n>` | `not used` | Use the word in this part |
| `asserts.must_not_use.<n>`, a banned-words item | `used` | Take the word out of this part's own text |
| `asserts.should.<n>`, a tone or structure item | `mostly against`, `a few lapses` | Rewrite this part to follow the rule |

A cascaded copy (`<path>.asserts.…`) is fixed in the part it is listed under, in that part's own text:
the parts inside it are checked by their own copies. The rule itself is written on the part at
`<path>`.

## When to trust a value

Act on a decisive value. Review again before acting on a value within 0.10 of 0.5.

## The spec it used

When the review generated the spec, the YAML ends with it as `spec: |`, with two comment lines showing
where `title` and `description` go. When you sent a spec, it is not repeated.

## Errors

`error: {code, message}`, with the tool's error flag set:

| Code | Means | Do |
|---|---|---|
| `spec_invalid` | A field of the spec is wrong; `path` names it | Fix that field; `check_spec` finds these for free |
| `request_invalid` | The call itself is malformed; `path` may name the argument | Fix the call |
| `document_too_large` | The document is over the size limit; `limit` and `estimate` are in tokens | Review it in parts |
| `review_failed` | The review did not finish | Try once more |

An argument that is missing or of the wrong type (no `format`, a spec sent as an object, not YAML text) is
refused before the tool runs, with the error flag set and a plain-text message naming the argument: fix
that argument and call again.
