---
'@foldkit/oxlint-plugin': patch
---

Recognize handlers returned by Effect constructors passed to `.toLayer` as deferred execution boundaries in `foldkit/no-impure-call-at-decision-time`, including ManagedResource `acquire` and `release` callbacks. Time and randomness calls inside invocation handlers are accepted. Eager argument expressions and unrelated callbacks are checked.
