---
'foldkit': patch
---

Internal: replace a ternary that wrapped the optional `resources` Layer in `Option.some`/`Option.none` with `Option.fromNullishOr`, the idiomatic primitive for `T | undefined` → `Option<T>`.
