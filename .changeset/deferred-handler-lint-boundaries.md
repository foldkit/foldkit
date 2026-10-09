---
'@foldkit/oxlint-plugin': patch
---

Recognize direct `.toLayer` handler callbacks and ManagedResource `acquire` and `release` callbacks as deferred execution boundaries in `foldkit/no-impure-call-at-decision-time`. Direct time and randomness calls inside these handlers are accepted, while eager argument expressions and unrelated callbacks remain checked.
