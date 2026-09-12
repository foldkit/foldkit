# Coming from TanStack Query

TanStack Query is excellent at what it does. It combines remote data, a keyed cache, and fetching policy behind hooks and a `QueryClient`. Foldkit has no `useQuery`, and it does not need one.

The value a request produces and the policy that obtains it are two different things. [AsyncData](/core/async-data) models the value. The Model, `update`, Commands, and Subscriptions define when work starts and what happens when it finishes.

TanStack Query supplies policies such as `staleTime`, retries, invalidation, and refetch-on-focus as configuration. Foldkit supplies the shared state machine and leaves application policy as visible state transitions. The trade is a query runtime configured from the outside versus ordinary application code you can read and test with everything else.

## Translating Concepts

Here is how common TanStack Query concepts map onto Foldkit:

| TanStack Query                                             | Foldkit                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `useQuery`                                                 | An [AsyncData](/core/async-data) field in the Model plus a fetch Command                      |
| `data` / `error` / `status` / `fetchStatus`                | The six `AsyncData` states, mapped below                                                      |
| Query cache (keyed by query key)                           | Model state: one `AsyncData` field, or an `Schema.HashMap` of them keyed by id                |
| `placeholderData: keepPreviousData` / stale data on screen | `Refreshing` and `Stale`, which retain the previous data                                      |
| `staleTime` / background refetch                           | A Subscription gated on a Model condition, applying `AsyncData.revalidate`                    |
| `staleTime: Infinity`                                      | `AsyncData.loadIfMissing`, followed by explicit revalidation when the application requires it |
| Request deduplication                                      | `AsyncData.revalidateOrLoad` yields `None` while that field has a request in flight           |
| Out-of-order response handling                             | Request context in the result Message, checked against the current Model in `update`          |
| `invalidateQueries`                                        | `AsyncData.revalidateOrLoad` plus the fetch Command, returned from `update`                   |
| `useMutation`                                              | A Message and a Command, like any other effect                                                |
| Retries                                                    | Effect’s `retry` and `Schedule`                                                               |
| TanStack Query Devtools                                    | [Foldkit DevTools](/devtools), which inspects the Model and Message timeline                  |

## Async State Is Model State

`AsyncData<A, E>` is a union of six states: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success`. `Refreshing` holds the previous data while a refetch is in flight. `Stale` holds the previous data after that refetch fails. Those variants make stale-while-revalidate and keep-stale-on-failure part of the value instead of conditions derived from several flags.

There is no separate query cache. The Model is the cache. A single resource lives in one `AsyncData` field. A collection of resources keyed by id lives in an `Schema.HashMap` of those fields. A cache hit is data the application already holds.

Here is the complete shape of a simple query. It uses one field, one Command, and two `update` arms:

::Snippet{name="useQueryTranslation" label="useQuery translation"}

Each behavior is visible in the transition that implements it. `revalidateOrLoad` returns `None` while the field is already `Loading` or `Refreshing`, so the same update path does not start another request. A successful value moves to `Refreshing` when revalidated, keeping the current list on screen. A cold field moves to `Loading`. When the Command finishes, `settle` folds its `Result` into the field and preserves previous data as `Stale` if a refresh fails.

The [API Cache example](/example-apps/api-cache) adds a keyed cache, instant cache hits, invalidation, and background polling using the same primitives. It is the complete answer to what replaces the machinery around `useQuery`.

## Mapping Query Status

The table below maps the common online query states. TanStack Query exposes `status`, `fetchStatus`, data presence, and derived flags independently, so it can represent more combinations than these six rows.

| TanStack Query                                                           | AsyncData                |
| ------------------------------------------------------------------------ | ------------------------ |
| Disabled or not yet started (`status: 'pending'`, `fetchStatus: 'idle'`) | `Idle`                   |
| `isLoading` (first fetch, no data yet)                                   | `Loading`                |
| `isRefetching && data !== undefined`                                     | `Refreshing({ data })`   |
| `isError && data === undefined`                                          | `Failure({ error })`     |
| `isError && data !== undefined`                                          | `Stale({ error, data })` |
| `isSuccess && !isFetching`                                               | `Success({ data })`      |

A paused fetch uses `fetchStatus: 'paused'`, and placeholder data can produce a successful query before the real result arrives. `AsyncData` does not assign those behaviors automatically. If offline pause or placeholder provenance affects the interface, represent it in the Model alongside the `AsyncData` field.

The difference is who tracks the combinations. In TanStack Query, failed data that remains available is a condition such as `isError && data !== undefined`. In Foldkit it is the `Stale` variant, and `AsyncData.match` requires the view to handle it. When a view only cares whether it has data, `matchData` collapses the six states into data, failure, and empty channels.

:::Warning{label="isPending means something different"}
TanStack Query’s `isPending` means the query has no data and no error yet. Its `isLoading` flag narrows that to a pending query that is actively fetching. `AsyncData.isPending` means a request is in flight, so it is true for both `Loading` and `Refreshing`. That is closer to TanStack Query’s `isFetching`.
:::

## Out-of-Order Responses

`AsyncData` models the state of one request lifecycle. It does not decide which of two independent responses should win.

Imagine a search starts a request for A, then starts a request for B before A returns. B finishes first. If the slower A response then overwrites it, the screen shows results for a query the user no longer wants.

Foldkit does not automatically cancel or order independent Commands. Thread the query through the Command into its result Message, then compare it with the current Model before accepting the result:

::Snippet{name="responseRaceGuard" label="response race guard"}

The late response for A sees that its `query` no longer matches `queryInput`, so `update` leaves the Model unchanged. The comparison uses the context the application already cares about. The same pattern works for a search request launched after every keystroke: accept the result only if it still belongs to the current query.

:::Info{label="Receipt-time checks"}
The guard is application policy, not incidental boilerplate. “Newest request wins” has to live somewhere. In Foldkit it is an explicit comparison against the current Model, in the same update function that decides what the result does.
:::

This snippet also shows where `keepPreviousData` belongs. `UpdatedQuery` currently moves the field to `Loading`, which removes the previous results while the new query runs. To retain them, move a data-holding state to `Refreshing({ data })` instead.

When a superseded request is expensive or the user can cancel it, define the Command with an `interrupt` field and dispatch its `Interrupt` Command. Keep the receipt-time check as well, because a result may already be queued when the interrupt arrives. See [Interrupting Commands](/core/commands#interrupting-commands).

## FAQ

### Where is useQuery? {#faq-where-is-usequery}

There is no equivalent hook, and you do not assemble one. A query is an [AsyncData](/core/async-data) field in the [Model](/core/model) plus a [Command](/core/commands) returned from `update`. The runtime executes the Command and dispatches its result Message. `update` then folds the result into the field.

### How do I cache responses? {#faq-caching}

Keep them in the Model. Use one `AsyncData` field for one resource or an `Schema.HashMap` keyed by id for many resources. A cache hit is a field for which `AsyncData.hasData` is true. See the [API Cache example](/example-apps/api-cache).

### How do I deduplicate identical requests? {#faq-dedup}

Use `AsyncData.revalidateOrLoad` in the update path that starts the request. It yields `None` while that field is `Loading` or `Refreshing`, so the handler returns no Command. This prevents duplicate work through that transition. It is separate from the receipt-time check above, which rejects obsolete work that did start.

### What about keepPreviousData? {#faq-keep-previous-data}

Choose the transition when the input changes. `Loading` removes the old data. `Refreshing({ data })` retains it while the new request runs. TanStack Query v5 exposes the same choice through `placeholderData`, commonly using its `keepPreviousData` helper.

### How do I poll or refetch in the background? {#faq-polling}

Use a [Subscription](/core/subscriptions) gated on a Model condition. On each tick, apply `AsyncData.revalidate` and return the fetch Command when it yields a transition. `Success` and `Stale` move to `Refreshing`, while a tick during an in-flight request starts nothing. The Subscription is torn down when its Model condition becomes false.

### How do I invalidate and refetch? {#faq-invalidate}

Apply `AsyncData.revalidateOrLoad` to the field and return the fetch Command when it yields a transition. Data-holding states move to `Refreshing`; a cold or failed field moves to `Loading`. The narrower `revalidate` skips fields that hold no data, which is useful when a mutation affects caches that may never have loaded.

### What about mutations? {#faq-mutations}

A mutation begins with a Message. Its update handler returns a Command that performs the write, and the result returns as another Message. That result handler can revalidate affected fields or update cached data directly with `AsyncData.map`.

### How do I do optimistic updates? {#faq-optimistic-updates}

Apply the optimistic edit to the Model with `AsyncData.map` in the same update arm that returns the mutation Command. Retain the previous value in the Model if the failure path needs to restore it, or revalidate after failure.

### Why write this yourself instead of letting a library do it? {#faq-own-the-behavior}

Foldkit ships the reusable state machine. Your application defines when to fetch, what counts as stale, and which fields a mutation refreshes. That policy differs from one application to the next, so Foldkit keeps it in ordinary Model state and update logic where the same tools and tests cover it.

A query runtime gives you more behavior out of the box. It also owns that behavior until its configuration changes it. Foldkit makes the opposite trade. Owning the policy is the reason to write it yourself, not an accidental cost.

The [Async Data](/core/async-data) page covers the Schema builder, matching helpers, transitions, and combining fields with `all`. If you are also coming from React, [Coming from React](/react/coming-from-react) covers components, hooks, effects, and their Foldkit counterparts.
