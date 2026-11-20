---
'foldkit': patch
---

Cap the DevTools `keyframeInterval` at half of `maxEntries`. With `maxEntries` below the interval, such as `devTools: { maxEntries: 20 }` and the default interval of 31, the first eviction moved the history start past Messages that were never recorded. The retained entries got indices that skipped ahead, and reading one of them through time travel or the MCP `foldkit_get_model_at` and `foldkit_diff_models` tools died with `getOrThrow called on a None`. Indices now stay contiguous, every retained index can be read, and an eviction keeps at least half of the history.
