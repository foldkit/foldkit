---
'foldkit': minor
---

Add `foldkit/asyncData`, a first-class six-state value type for
asynchronously loaded data, in the spirit of Effect's `Option` and
`Result`. It is the RemoteData pattern from Elm, generalized with
refresh-aware states.

The union is `Idle | Loading | Refreshing({ data }) | Failure({ error }) |
Stale({ error, data }) | Success({ data })`: `Refreshing` carries the
previous good data through a reload and `Stale` carries it through a failed
reload, so stale-while-revalidate and keep-stale-on-failure are both
type-level states. `AsyncData.Schema(dataSchema, errorSchema)` builds the
Union codec to embed in a Model (including inside `S.HashMap` caches), and
the namespace ships free, pipe-friendly dual combinators: `match`, the
`matchData` and `matchDataSplit` view collapses, `map`, `mapError`,
`mapBoth`, `flatMap`, getters and predicates, `orElse`, the
`revalidateOrLoad` and `revalidate` revalidation transitions, the
`zipWith` and `all` combinators for combining several values under one
precedence rule, and the previous-state-aware `settle` that folds a
fetch's settled `Result` back into the Model, keeping last-good data as
`Stale` on failure.
