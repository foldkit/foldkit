---
'foldkit': minor
---

Add cache writes, test fixtures, and accepted-Fetch notifications to experimental Query. `setData` writes a value as `Success` without fetching, and `updateData` transforms retained data, leaving a Query without data unchanged. Both advance the request generation, so a pending Fetch's result is ignored. KeyedQuery takes `{ args, data }` and `{ args, toNextData }`. `seed` builds a Query or KeyedQuery Model in any `AsyncData` state for tests, with request generation 0. `updateWithOutMessage` returns an `AcceptedFetch` OutMessage when Query accepts a Fetch result, and `lift` accepts an optional `foldOutMessage` that folds it into the parent. Existing `update` and `fold` call sites are unchanged.
