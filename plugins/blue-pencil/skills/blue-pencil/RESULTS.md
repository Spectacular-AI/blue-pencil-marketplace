# Reading a review

A review is YAML: a headline, a score per metric, then every section by its section path, each check by
its key in the spec ([SPEC.md](SPEC.md), "Paths").

```yaml
review: {pass: false, checks: 178, failed: 18, ms: 161}
metrics:
  writing_slop: {score: 0.84, failed: 13, sure_fail: 7, unsure: 11, sure_pass: 117}
sections:
  whole_document:
    passed:
      asserts.includes.0: 0.96; present 0.96, elsewhere 0.03, partly 0.01, missing 0, no section 0
  what-changed:
    failed:
      asserts.conveys.0: 0.31; partly 0.62, stated 0.31, missing 0.07, hedged 0, elsewhere 0, contradicted 0
      banned_words.em-dash: 0.04; contained 0.96, left out 0.04
  upgrade-steps:
    status: missing
    failed:
      present.when: 0.07; holds 0.93, does not hold 0.07
```

## The headline and metrics

- `review`: whether every check passed, how many checks ran, how many failed, how long it took.
- `metrics`: one line per kind of check: its mean value, how many failed, and how many were decisive
  fails (`sure_fail`), unsure, and decisive passes (`sure_pass`).

## A check's line

`<key>: <value>; <answers>`. The higher the value, the more the answers lean towards a pass. The answers
follow, likeliest first, each with its probability; `catalog` says which answers pass for each kind. An
answer is a label such as `present` or `missing`: `present` there means "stated in the section", not the
`present` check. A presence check asks two questions (is there such a heading; does the part do what its
description says), separated by `;`, and passes only when both do. A `present.when` check lists one
answer per condition.

Within a section, `failed` comes before `passed`, and each lists its checks by value, lowest first. The
item's words are not repeated: look them up in the spec by the key. A checked section with no checks is
left out; a section with any other status is always listed, with its `status` alone if it has no checks.

## A section's status

Written only when it is not `checked`:

| Status | Means | Its own checks |
|---|---|---|
| `checked` | Found, or has no heading to look for | Listed |
| `missing` | Not found, and that fails: it is required, or one of its conditions holds | Not listed |
| `absent` | Not found, and that is fine: it is optional | Not listed |
| `skipped` | Its parent was not found, so it was never looked for | Not listed |

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

An argument of the wrong type (a spec sent as an object, not YAML text) is refused before the tool runs,
with the error flag set and a plain-text message: send the spec as text.
