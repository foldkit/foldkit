---
'@foldkit/oxlint-plugin': patch
---

Recognize handlers returned by attached constructor Effects or external `.toLayer` alternatives as deferred execution boundaries in `foldkit/no-impure-call-at-decision-time`, including ManagedResource `acquire` and `release` callbacks. The rules follow immutable local handler functions and lifecycle objects through local aliases and supported Effect constructors without guessing imported, mutable, cyclic, or escaping values. Time and randomness calls inside invocation handlers are accepted. Eager argument expressions and unrelated callbacks are checked.
