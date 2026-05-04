---
'foldkit': patch
---

Fix per-keystroke input latency in apps using `devTools: { Message }` once history accumulates.

The DevTools store stamps the post-update model into `StoreState.maybeLatestModel` on every `recordMessage`, and `getModelAtIndex` returns it directly when the requested index is the latest entry. The inspector's follow-latest path (the default while the user types) used to recover that same model by replaying up to `KEYFRAME_INTERVAL` user updates against the most recent keyframe, calling the consumer's update function plus `deepFreeze` on every step. With a large user model that walk dominated each dispatch and grew with history depth.

Time-travel still goes through `replayToIndex`. Only the latest entry takes the new fast path, and only when `maybeLatestModel` is populated.

Adds a `Deep history` scenario to `internal/performance-harness` that fills the store with 500 small Messages so the regression is reproducible in one click.
