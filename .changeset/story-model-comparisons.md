---
'foldkit': minor
---

Return the final Model from Story after verifying that every Command was resolved. Block-aware Stories now yield that Model from their scoped Effect while preserving construction errors and Service requirements. A Story without `given(...)` or `init(...)` fails instead of exposing its uninitialized internal seed.

Add `Story.models(Story.steps(...), (before, after) => ...)` for assertions that compare the Models immediately around a declarative group of Story steps. Nested Messages, InMessages, child deliveries, Commands, and OutMessages retain their existing typing and behavior.

Callers can ignore the returned Model. Helpers with an explicit `Effect<void, ...>` result can pipe the Story through `Effect.asVoid`.
