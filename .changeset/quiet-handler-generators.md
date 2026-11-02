---
'@foldkit/oxlint-plugin': patch
---

Disable `require-yield` in the recommended preset. A Foldkit Layer is built from `Effect.gen(function* () { ... })`, and a constructor with no Service lookup intentionally has no `yield`. Consumers can re-enable the rule in their own config.
