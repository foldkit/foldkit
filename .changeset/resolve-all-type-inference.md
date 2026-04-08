---
'foldkit': minor
---

Fix `resolveAll` mapper parameter typed as `unknown` instead of inferring from the Command definition's result Message type. Uses a mapped tuple type to infer `ResultMessage` per resolver, matching `resolve`'s behavior. Rename `ResolverPair` to `Resolver` and extract shared cascading resolution logic to `internal.ts`.

Migration: replace `Story.ResolverPair` / `Scene.ResolverPair` with `Story.Resolver` / `Scene.Resolver`.
