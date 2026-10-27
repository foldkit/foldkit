---
'foldkit': minor
'create-foldkit-app': patch
'@foldkit/oxlint-plugin': patch
---

Add `Definition.makeStep.fromMessage(producer)` for Message-only producers of
composed Steps, update results, and child initialization recipes. Inline
`makeUpdate` entries infer their exact Message payload. Extracted producers use
a precise Message variant annotation. The returned handler stays Model-first
and evaluates its producer when applied.

Step output validation checks every possible result branch, including deferred
Steps. An invalid branch cannot be hidden beside a valid result. Command
requirements, OutMessages, and child registration checks are retained.

Teach lint ownership checks about the new adapter and document its use in the
scaffold guidance. Ordinary Model-aware `makeStep` producers and cohesive
direct-result handlers keep their existing roles.
