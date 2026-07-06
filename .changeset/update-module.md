---
'foldkit': minor
---

Add the `Update` module and supporting cache helpers.

`foldkit/update` provides `combine`, which folds a list of update steps into one and concatenates their Commands in order, and `refresh`, which revalidates a single AsyncData cache field and emits its load Command only when the entry should transition. It also exports `noOp` and the `Commands`, `Return`, `ReturnWithOutMessage`, `Step`, and `Refreshable` type aliases. `combine` is dual: call it data-first as `combine(model, steps)` to run the steps now, or data-last as `combine(steps)` for a composable `Step`.

`AsyncData.getOrIdle` collapses an `Option<AsyncData>` to an `AsyncData`, mapping `None` to `Idle`, for reading a keyed cache where an absent key means nothing was requested yet.

`Route.isEntering` and the `RouteTransition` type describe a route change and test whether it entered a given route, so navigation and `init` can share one load-on-entry policy.
