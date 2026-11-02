---
'foldkit': minor
'create-foldkit-app': patch
---

Add freshness-aware loading, cancellation, and an optional completion OutMessage to experimental Query and KeyedQuery. KeyedQuery can also bound how many settled entries it retains.

Set `staleTime` in `Query.define` and send `RequestedLoadIfStale` with a `nowMillis` timestamp read from Effect's Clock. Successful data older than `staleTime` is refetched; expiry does not remove the retained data. `staleTime` defaults to Infinity.

`maxSettledEntries` limits a KeyedQuery's settled entries by request and completion recency. Pending requests are never evicted and can temporarily exceed the limit. A cache hit updates recency without extending freshness.

Send `RequestedCancel` to cancel the pending request. The Query stops tracking that request immediately and returns an interruption Command for its Fetch. A canceled refresh restores its last successful value, unless KeyedQuery's settled-entry limit has evicted it. Other pending keys are unaffected. A cancellation that runs before the fetch starts finds nothing to interrupt, and the late result is ignored. Cancellation is scoped to one request, so it cannot interrupt a later request for the same key.

Set `notifyOnCompletion: true` to receive a `CompletedFetch` OutMessage after an accepted success or failure. Handle it in the parent with `query.on({ CompletedFetch: ... })`. Stale, canceled, duplicate, and evicted completions do not notify. Without the option, the Query declares no OutMessage.

Query Models include freshness metadata, and KeyedQuery Models also include recency metadata. Migrate any persisted experimental Query Models when upgrading. A hand-built `CompletedFetch` may omit `completedAtMillis`; with a finite `staleTime`, the data is then treated as needing revalidation.

Update the scaffold and application skills with Query ownership and loading guidance.
