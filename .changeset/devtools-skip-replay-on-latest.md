---
'foldkit': patch
---

Fix dispatch latency in apps using `devTools: { Message }` as history accumulates.

`getModelAtIndex(latest)` runs on every dispatch while the inspector follows the latest entry. That call used to replay up to `KEYFRAME_INTERVAL` user updates from the most recent keyframe, calling the consumer's update function plus `deepFreeze` on every step. The cost scaled with both history depth and model size, so every dispatch got progressively slower.

The store now stamps the post-update model into `StoreState.maybeLatestModel` on every `recordMessage`, and `resolveModel` returns it directly when the requested index is the latest entry. Time-travel still routes through `replayToIndex`.
