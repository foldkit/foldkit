# Async Data

`foldkit/asyncData` is a plain value type in the spirit of Effect’s `Option` and `Result`, built for data that arrives asynchronously. This page introduces the state model and the combinators you reach for most. The [API Reference](/api-reference/async-data) has the exhaustive catalog.

## Overview

Server data in a Model is never just data or nothing. Between “we have it” and “we do not” sit “we asked and are waiting”, “the ask failed”, “we have last week’s copy and are refetching”, and “the refetch failed but we kept the copy”. A boolean `isLoading` next to a nullable `data` field cannot tell those apart, and every screen that renders the field ends up re-deriving the distinction from a tangle of flags.

`AsyncData<A, E>` makes the distinction the type. The idea is the pattern Elm calls RemoteData, generalized. It is a first-class value like `Option` or `Result`: an ADT plus a namespace of free functions over it. You embed one Schema in your Model, and every read, transform, and transition goes through named combinators that already know the state machine. The module is the noun. It is not a data-fetching engine and not a cache. The keyed cache, the refresher, and route-driven loading stay application patterns.

Throughout this page, the running example is a Notes app: a `Note` belongs to an optional `Notebook`, and the Model holds several `AsyncData` fields for the notebook list, the cross-notebook feed, and the per-entity caches.

## The Six States

The type has one axis for data presence and one for request status, and the six variants are the meaningful combinations.

| Variant      | Payload           | Meaning                                                    |
| ------------ | ----------------- | ---------------------------------------------------------- |
| `Idle`       | none              | Nothing requested yet.                                     |
| `Loading`    | none              | First request in flight, no prior data.                    |
| `Refreshing` | `{ data }`        | Reloading while holding the previous good data.            |
| `Failure`    | `{ error }`       | Request failed; showing the failure.                       |
| `Stale`      | `{ error, data }` | Last refresh failed; still holding the previous good data. |
| `Success`    | `{ data }`        | Request succeeded, data present.                           |

The public type is value-first `AsyncData<A, E>`, matching `Result<A, E>` and `Exit<A, E>`.

::Snippet{name="asyncDataType" label="type definition code"}

Three classifications recur across the API, and every combinator is derived from them:

- “has data”: `Success`, `Refreshing`, `Stale`.
- “no data”: `Idle`, `Loading`, `Failure`.
- “pending” (a request in flight): `Loading` and `Refreshing` only. `Stale` is not pending; its fetch already failed.

:::Info{label="Coming from Elm"}
The classic Elm RemoteData has four states (`NotAsked`, `Loading`, `Failure`, `Success`). `Refreshing` and `Stale` are the two states this module adds, and they are the whole point of the next section.
:::

## Stale-While-Revalidate and Keep-Stale-on-Failure

`Refreshing` and `Stale` are the two data-bearing states that are not fresh, and together they are the module’s differentiator. Both hold the last-good `data`, so a view can keep rendering it, but they mean opposite things about the request.

`Refreshing({ data })` is a refetch in flight over data you already have. This is stale-while-revalidate: the list stays on screen, perhaps under a subtle spinner, while a fresh copy is on the way. Pending means a request is running, and holding data does not change that. So the combinators treat `Refreshing` both ways: `getData` hands you its data exactly as it does for `Success`, and `isPending` reports true exactly as it does for `Loading`.

`Stale({ error, data })` is a refetch that failed while data you already have is still worth showing. This is keep-stale-on-failure: the refresh errored, but rather than blanking the screen to a bare `Failure`, the state carries both the `error` (so you can surface a “could not refresh” banner) and the last-good `data` (so the list stays up). The combinators treat it accordingly: `getData` hands you its data and `getError` hands you its error. It is the failed-refresh mirror of `Refreshing`.

Because both are type-level states, “show stale data while revalidating” and “keep stale data when the refresh fails” are things the compiler tracks for you, not conventions you re-implement per screen. A view that handles `onRefreshing` and `onStale` explicitly gets both behaviors; a view that routes them through a data handler (see `matchData` below) gets them for free.

## The Schema Builder

`AsyncData.Schema(dataSchema, errorSchema)` returns the codec you embed in a Model, plus constructors constrained to those data and error types. The returned `.schema` is the six-state Union codec.

::Snippet{name="asyncDataSchema" label="Schema builder code"}

:::Info{label="Error types"}
The error Schema is simplified to `string` here; a real app usually gives each field a domain error Schema, for example a union of a tagged `NotFound` and `string`.
:::

A single field embeds `.schema` directly. A keyed cache embeds it as the value Schema of an `Schema.HashMap`, which is how `noteById` holds one independent `AsyncData` per `NoteId`. The Model type of a field is `typeof NotesAsyncData.schema.Type`, structurally equal to `AsyncData.AsyncData<ReadonlyArray<Note>, string>`.

To construct a value, use the namespace constructors (generic in `A`/`E`) or the factory-returned ones (tightened to the Model’s `A`/`E`). They build identical runtime values.

::Snippet{name="asyncDataConstructors" label="constructors code"}

## Working With the Value

The API is a namespace of free, curried-dual functions over `AsyncData<A, E>` values, like `Option`, `Result`, and `Exit`. Both `pipe(notes, AsyncData.map(f))` and `AsyncData.map(notes, f)` work.

The fundamental way to read a value is `match`. It dispatches on the tag and passes the unwrapped payload to each of six required handlers. Handler keys are tag-named here because each handler covers exactly one tag. The one asymmetry is `onStale`, which receives the whole `{ error, data }` object, because only `Stale` carries two fields.

::Snippet{name="asyncDataMatch" label="match code"}

Most views do not need six arms. `matchData` collapses the six states into the three channels a view usually renders: `onData` spans `Success`, `Refreshing`, and `Stale`; `onFailure` receives the `Failure` error; and `onEmpty` covers `Idle` and `Loading` together. Routing `Stale` through `onData` is the point of keeping its data. `matchDataSplitEmpty` is the same collapse with the two cold states split into `onIdle` and `onLoading`, for views that render them differently. Reach for `match` when the stale error or the `Refreshing` signal matters.

::Snippet{name="asyncDataMatchData" label="matchData code"}

`AsyncData.map` transforms every data-bearing state and preserves its tag, so a pure transform does not erase the `Refreshing` or `Stale` signal. `Stale` maps only its `data` and keeps its `error`. This is how a mutation can edit cached data in place without erasing its request state.

::Snippet{name="asyncDataMap" label="map code"}

`getData` returns `Option<A>`, `Some` for the three data-bearing states (`Success`, `Refreshing`, `Stale`) and `None` otherwise. `hasData` is the boolean form, and `getError` / `hasError` are the error-channel twins, spanning `Failure` and `Stale`. Reaching through a cache entry to a field is the common shape.

::Snippet{name="asyncDataGetData" label="getData code"}

:::Info{label="Stale is not pending"}
`isPending` is true for `Loading` and `Refreshing` only, not `Stale`. It answers “is a request in flight”, so it drives a spinner regardless of whether data is held. `Stale` does not mean merely outdated data in this union. It is specifically the state a failed refresh leaves behind, which is why it always carries the error.
:::

The getter vocabulary is deliberate: predicates are tag-named (`isSuccess`, `isFailure`) but getters are payload-named (`getData`, `getError`, and their boolean twins `hasData`, `hasError`), because `getData` spans three tags and `getError` spans two, so a tag-named getter would be wrong.

## Revalidating

Two transitions drive route-entry loading, and both send `Success` and `Stale` forward into `Refreshing`, so a revalidation always shows the last-good data while the new fetch runs.

`AsyncData.revalidateOrLoad` is the route-entry decision. It returns `Option<AsyncData>`: cold no-data states (`Idle`, `Failure`) start `Loading`, already-pending states (`Loading`, `Refreshing`) yield `None` so the app does not restart an in-flight fetch, and both loaded states (`Success`, `Stale`) revalidate to `Refreshing`. `None` means “no transition needed”.

::Snippet{name="asyncDataRevalidateOrLoad" label="revalidateOrLoad code"}

`AsyncData.revalidate` is the narrower transition for reloading what is already loaded, typically after a mutation. It revalidates `Success` and `Stale` to `Refreshing` and yields `None` for everything else, so it never cold-starts a `Loading`, and a cache that holds nothing is left alone.

::Snippet{name="asyncDataRevalidate" label="revalidate code"}

`AsyncData.loadIfMissing` is the first-visit load: the cold no-data states (`Idle`, `Failure`) start `Loading`, and every other state yields `None`, so loaded data is kept without revalidation and a request in flight is not restarted. It is the load-only counterpart of `revalidateOrLoad`, the state-machine form of “fetch on first visit, keep the cache afterwards”.

::Snippet{name="asyncDataLoadIfMissing" label="loadIfMissing code"}

These three functions are the building blocks of route-driven loading: deciding per cache, on every route change, whether to load, revalidate, or leave the state alone.

## Settling a Fetch

When a fetch comes back, you fold the result into the field with one helper: `settle`. It takes the previous state and a settled `Result` and decides the next state from both.

On success, it yields `Success`. On failure, it checks the previous state: if it `hasData`, the failure becomes `Stale({ error, data })`, keeping the last-good data; otherwise it becomes a bare `Failure`. That single decision is where keep-stale pays off: it collapses a hand-written `Succeeded*` / `Failed*` handler pair into one line that keeps stale data on error.

There are two valid styles for bringing a fetch back into `update`, and neither is strictly better. The first names each outcome as its own Message, and the Command dispatches whichever happened:

::Snippet{name="asyncDataSettlePair" label="handler pair code"}

The second folds both outcomes through one Message. The Command wraps the fetch in `Effect.result`, so success and failure both arrive as a settled `Result`, and dispatches a single `Settled*` Message carrying it. In `update`, `settle` folds that `Result` into the previous state, and a failed refresh keeps the list instead of blanking it:

::Snippet{name="asyncDataSettle" label="settle code"}

Pick by what the outcomes mean. When success and failure drive genuinely different flows (navigate on success, open a dialog on failure), the named pair keeps each flow in its own arm. When the fetch lands in a cache field, the settled style is one arm instead of two and keeps stale data on error for free.

:::Info{label="Dropping data on purpose"}
If you deliberately want a failed refresh to drop the previous data, write that fold as an explicit `Result.match` in your handler; it is not a library function, so the choice stays visible at the call site.
:::

## Combining Several

A screen that needs several resources at once combines them with one precedence rule using `zipWith` (two values plus a combining function) or `all` (an iterable or a record). The record form of `all` is the multi-resource screen: it combines a record of fields into one value whose data is a struct of every field’s data. The combined value is itself an `AsyncData`.

::Snippet{name="asyncDataAll" label="all code"}

The precedence, most to least dominant, is `Failure > Loading > Idle > Stale > Refreshing > Success`. Reading it is a two-tier rule. If any input is a no-data state, the result is the highest-ranked such state with no combination, and the leftmost `Failure`’s error wins. Otherwise every input has data, so the data is combined and the result tag is the highest-ranked data state present: any `Stale` makes the whole result `Stale`, else any `Refreshing` makes it `Refreshing`, else it is `Success`. That is the payoff: the whole screen shows combined stale data while any part revalidates, and carries it forward even after a failed refresh.

:::Warning{label="All-or-nothing on data"}
The combine is all-or-nothing on data. Because the combined value needs every input’s data, a single no-data child collapses the whole result to that non-data state. `zipWith(Idle, Success(x), f)` discards `x` and yields `Idle`. This is forced, not a bug. Combining also requires a shared error type `E`; unify heterogeneous errors with `mapError` first.
:::

An `AsyncData` field lives in one place: the [Model](/core/model), the single source of truth. Fetches are [Commands](/core/commands): run the fetch through `Effect.result`, carry the `Result` in the Message, and fold it in with `settle`. [Field Validation](/core/field-validation) is the sibling shipped module in the same tier, and the [API Reference](/api-reference/async-data) has the generated, exhaustive catalog of every name and its per-state behavior.

[Coming from TanStack Query](/react/coming-from-tanstack-query) maps the six states onto query status and cached data, and the [api-cache example](/example-apps/api-cache) is a full app wiring a keyed cache, a generic refresher, and route-driven loading together on this type.
