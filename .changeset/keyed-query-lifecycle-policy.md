---
'foldkit': minor
'create-foldkit-app': patch
---

Add freshness-aware loading, targeted cancellation, and optional accepted-completion OutMessages to experimental Query. KeyedQuery also supports bounded retention of settled entries and public inspection of pending arguments.

Configure `staleTime` and pass an Effect Clock timestamp to `requestLoadIfStale`. Expiry affects reuse without removing retained data. Existing loading operations retain their policies. `maxSettledEntries` limits settled KeyedQuery entries by request and completion recency; pending requests are protected and can temporarily exceed that bound. Cache hits update recency without extending freshness.

`requestCancel` invalidates the selected pending generation immediately and returns an interruption Command. A canceled refresh restores its last successful value, subject to KeyedQuery's settled-entry limit, which may evict retained data. Other pending keys are unaffected. Interruption reclaims already-running work; a cancellation executed before the fetch starts may find no running holder, but its late result is rejected. Cancellation uses generation-specific keys, so it cannot interrupt a subsequent request at the same key.

Set `notifyOnCompletion: true` to receive `OutMessage.CompletedFetch` through a registered Binding policy after an accepted success or failure. Stale, canceled, duplicate, and evicted completions do not notify. Queries omit this OutMessage contract by default.

Query Model Schemas include freshness metadata; KeyedQuery Models also include recency metadata. Initialize through the Query Block and migrate persisted experimental Query Models when upgrading. Fetch Commands now expose interruption keys. Manually resolved completion Messages may omit the timestamp; finite freshness then treats the data as requiring revalidation. Generated handlers record completion time automatically.

Update scaffold and application skills with Query ownership and loading guidance.
