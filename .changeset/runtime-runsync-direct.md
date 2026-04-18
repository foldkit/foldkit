---
'foldkit': patch
---

Internal refactor: call `Effect.runSync` directly in the runtime instead of `.pipe(Effect.runSync)`. Purely stylistic; no runtime behavior change.
