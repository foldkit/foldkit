---
'foldkit': patch
---

Tidy the `resources` TSDoc on `Runtime.makeProgram`'s config into two sentences. Behavior is unchanged. The guidance still steers stateless utilities like `HttpClient` and JSON encoding away from `resources` and toward per-command `Effect.provide`.
