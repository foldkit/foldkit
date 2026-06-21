---
'foldkit': minor
---

Provide the resource-lifetime `Scope` to a Managed Resource's `acquire`. The `acquire` callback now runs with `Scope.Scope` in its context, the same scope the runtime closes on release or re-acquire. This lets `acquire` build an Effect `Layer` with `Layer.build` or register finalizers with `Effect.addFinalizer` whose teardown is tied to the resource lifecycle, so the tag can hold the bare service value with no wrapper and `release` can be `() => Effect.void`. The explicit `release` callback still runs before the scope finalizers, matching the last-in-first-out order Effect uses for any scope. Existing resources that do not use the scope are unaffected.
