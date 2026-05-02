---
'foldkit': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
---

Migrate the entire codebase to Effect 4 (`effect@4.0.0-beta.59`).

This is a breaking change. Highlights:

- All Schema callable wrappers (`m`, `r`, `ts`) now use a Proxy targeting a function so callable construction works under v4 (where `Schema.TaggedStruct` is no longer directly callable).
- Replaced `Schema.transform` with `Schema.decodeTo` + `SchemaTransformation` throughout.
- Replaced `Either` decode results with `Exit`; replaced general `Either` usage with `Result`.
- Replaced `Stream.async` with `Stream.callback` + `Queue.offerUnsafe` + `Effect.acquireRelease`.
- Replaced `Context.Tag` / `GenericTag` / `Effect.Service` with `Context.Service`.
- Updated subscriptions: `Stream.async` → `Stream.callback`, `Stream.when` semantics adjusted.
- HTTP/RPC/CLI/Persistence moved to `effect/unstable/*` namespaces.
- Tests updated to use `it.effect` (replacing `it.scoped`) and `TestClock` from `effect/testing`.
- Query parameter schemas use `S.OptionFromOptional` (v4 `OptionFromUndefinedOr` requires the key to be present).
- `S.NumberFromString` no longer rejects NaN. Use `S.FiniteFromString` where strict numeric parsing is required.
- `Effect.yieldNow` is now a value, not a function.
