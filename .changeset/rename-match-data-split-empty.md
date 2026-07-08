---
'foldkit': minor
---

Rename `AsyncData.matchDataSplit` to `AsyncData.matchDataSplitEmpty`. This is a breaking rename. The new name says what the variant splits: the `onEmpty` channel that `matchData` collapses is broken back into `onIdle` and `onLoading`. Behavior and handler shape are unchanged; update call sites from `AsyncData.matchDataSplit(...)` to `AsyncData.matchDataSplitEmpty(...)`.
