# Reviewing part of a document

Every review carries the whole document and the whole spec, as text you write out. While you revise a
long document, review only the sections you changed, a **fragment**, against a **cut** of the spec: the
parts that govern those sections, lifted to the top. The review asks a section's own rules of the
section alone, so a fragment's checks on them match the whole document's. What a fragment cannot
answer, the last review of the whole document does.

## When

| You are about to | Review |
|---|---|
| Review for the first time, or for the last time before you report | The whole document against the whole spec |
| Review again after changing a few sections of a long document | A fragment of those sections against a cut |
| Review on a plan that refuses a spec (`plan_required`) | The whole document: a fragment needs its cut |
| Review a document over the size limit (`document_too_large`) | Fragments, one after another, until every section has been reviewed |

A fragment is worth it when what it leaves out is much longer than the cut you write.

## 1. Cut the document

Copy each changed section exactly as it is on disk: from its heading to the line before the next
heading at the same level or higher, its subsections included, every heading at its own level. Add no
title and no lead. Several sections go in their order in the document.

Done when the fragment holds each changed section whole, and nothing else.

## 2. Cut the spec

Write a new spec ([SPEC.md](../blue-pencil-spec/SPEC.md)):

- **Lift each section's part to the top:** its part, with every part inside it, goes under `children`.
  Its path loses the keys above it: `operations.rollout.canary` becomes `rollout.canary`.
- **Each lifted part is `present: required`**, its `comes` taken off. A `present: {when: …}` becomes
  `required`. The parts inside it keep their own `present` and `comes`.
- **Carry down what reaches the part from above:** the top's `tone`, `packages` and `define`; the
  cascading rules (`should`, `must_not_use`, any rule with `cascade: true`) written at the top and on
  every part above it; and the package choices and overrides made on those parts. A rule or override
  below that turns one of these off, or rewords it, is refused without its source.
- **The top's rules that do not cascade stay out:** the review would ask them of the fragment as if it
  were the whole document.
- **References follow the cut:** rewrite each path in `references` to the cut's paths. For a rule that
  reads a section outside the fragment, add that section to the fragment and its part to the cut, or
  take the reference out of the cut.

Call `check_spec` on the cut: it is free, and names any field the cut broke.

Done when `check_spec` returns the cut.

## 3. Review and decide

Call `review` with the fragment, `format` `markdown`, and the cut. Read the answer with
[RESULTS.md](RESULTS.md), and decide each failed and borderline check as "3. Decide" in
[SKILL.md](SKILL.md) says. The cut changes three things:

- **Paths are the cut's.** Put back the keys above the lifted part (`rollout.canary` is
  `operations.rollout.canary`) whenever you write a path down or name a part to the user.
- **The headline covers the fragment alone.** Its `pass` and `score` speak for these sections; the
  document's come from the whole review.
- **Some results come from the cut itself:** a check under `whole_document`, a lifted part `missing`
  because the fragment left it out, and a rule `unasked` because it reads a part outside the fragment.
  Leave these for the whole review.

## 4. Finish with the whole

When a fragment's review has no failed check, review the whole document against the whole spec. It
alone answers for where sections sit (`comes`), the parts around the fragment, the rules that read
other parts, the rules at the top, and the document's score. Act on it and report it as "Revise" and
"Report" in [SKILL.md](SKILL.md) say.

A document over the size limit has no whole review: its fragments, together covering every section,
are its review. Tell the user it was reviewed in parts, and which of the checks above no part could
answer.
