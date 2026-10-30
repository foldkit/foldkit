# Query

:::Warning{label="Experimental"}
Query ships from `foldkit/experimental`. Its fetch and retention model is usable today, but names, types, Model shape, and Messages may change before the module moves into Foldkit's stable API.
:::

:::Info{label="See it in an app"}
To see how Query is used in a complete Foldkit application, visit [API Cache Query](/example-apps/api-cache-query). It includes a Query that loads when it is created, a KeyedQuery loaded by id, refreshes driven by a Subscription, and Story and Scene tests.
:::

## Overview

### Viewless Request State

Fetching data in a Foldkit application usually takes the same pieces: an [AsyncData](/core/async-data) value in the Model, a Command that performs the request, a Message carrying the result, and update handlers that begin and settle the request. That explicit loop is useful when a request belongs to a larger workflow. It becomes repetitive when the application only needs to retain a resource and refresh it later.

Think of Query as that standard request loop packaged around an `AsyncData` value. Query is a viewless Block: it owns the `AsyncData` state, the Fetch Command, the completion Message, the update logic, and protection against late responses. The parent stores the Query instance in its Model, sends it Messages, and reads the retained `AsyncData` value for rendering.

### Query and KeyedQuery

A Query retains one resource, such as the current account or a list of posts. A KeyedQuery uses the same definition to retain separate entries for arguments such as post ids. Both keep successful data available while a refresh is pending or fails.

### When to Use Query

Use Query when a request produces one retained resource, or one entry in a retained collection, and the standard loading, refreshing, failure, and stale states describe its lifecycle. The parent can react to accepted results through completion OutMessages. Use `AsyncData` directly when the application needs to own the request lifecycle together with other state, such as optimistic mutation reconciliation and rollback. [When to Use AsyncData Directly](#when-to-use-asyncdata-directly) shows an application-owned request loop.

### The Parent Controls Loading and Refreshing

The parent decides when a Query loads or refreshes. In response to one of its own Messages, such as a route change, a button click, a mutation result, or a Subscription tick, its update handler sends the Query a `Requested*` Message. Query update checks the current `AsyncData` state and returns either the unchanged Model or the next Model and a Fetch Command.

Query does not react to rendering, poll, or refresh related resources on its own. The parent owns those decisions and expresses them through its Messages, update handlers, and Subscriptions. A configured freshness duration informs `RequestedLoadIfStale` when the parent sends it. Elapsed time alone does not dispatch a Message, remove data, or start a request.

## Define a Query

### Definition Fields

#### Configuration

Import the `Query` namespace from `foldkit/experimental`. Give `Query.define` a name, the data and error Schemas, and a `handler` that constructs the fetch function:

::Snippet{name="queryDefine" label="Defining a Query for posts"}

With no `args`, `Query.define` returns a Query class that retains one value. In this definition:

- `data` and `error` determine the `AsyncData`, Model, and Message Schemas.
- `name: 'Posts'` is the Block id, and it prefixes the Query's `Posts/Fetch` and `Posts/CancelFetch` Commands.
- The `handler` generator constructs the fetch function. Because the definition has a `handler`, the class carries its Layer as `PostsQuery.Live`.

Set `staleTime` to an Effect `Duration.Input` when the parent should revalidate successful data after a fixed interval. The default is `Duration.infinity`, so successful data remains fresh until the parent explicitly requests revalidation. Query records the successful fetch's completion time from Effect Clock; a failed refresh keeps the previous successful timestamp. The interval does not change `read` or remove retained data.

The `data` and `error` values must be Schema Codecs that require no encoding or decoding services. Query uses them to build its Model and completion Message Schemas.

#### The Query Layer

The `handler` generator runs once, when the Runtime builds `PostsQuery.Live`. Services it yields become requirements of that Layer, and the returned fetch function runs for every Fetch Command. Provide `PostsQuery.Live` to the Layer of each parent that creates a `PostsQuery` instance, and provide ordinary services such as an HTTP client through `ApplicationLayer` as usual.

Omit `handler` when a host supplies the fetch implementation. The class then has no `Live`, and `PostsQuery.toLayer(build)` creates its Layer from an Effect that constructs the fetch function. `toLayer` also builds an alternative Layer for a Query that has a `handler`. Tests usually keep the handler and replace the services it yields instead.

`PostsQuery.run` runs the fetch function directly and returns settled `AsyncData`, outside any Block. It requires the Query's fetch function, so provide `PostsQuery.Live` or a `toLayer` result to the Effect.

#### The Query Class

`PostsQuery` is a Block class with no view. Alongside its Block contract it carries:

- `PostsQuery.Message`, the `Requested*` Messages a parent sends and the Query's own completion Messages.
- `PostsQuery.read` and `PostsQuery.isFresh`, which read a Query Model.
- `PostsQuery.Fetch` and `PostsQuery.CancelFetch`, the Command definitions Story and Scene tests match and resolve.

### Store the Query in Its Parent

The parent puts the class in its Model Schema, creates an instance in its constructor with `yield* new PostsQuery('posts', args)`, and stores that instance in the Model. Its update handlers change the Query only by sending it Messages:

::Snippet{name="queryParent" label="Storing a Query in its parent"}

#### Creating the Instance

Name the instance for its role in the parent, and use the same name for the Model field and the id. Pass `{}` to create an `Idle` Query. Pass `{ isLoadingOnStart: true }` to return a first Fetch Command as a `start` Command when the instance enters the Model. Rendering the parent does not start a request.

The parent's Layer must provide `PostsQuery.Live`, as the `Layer.provide` call at the end of the snippet does.

#### Sending Requests

A parent handler returns the Query's Messages in `messages`, addressed with `model.posts.send(...)`:

- `PostsQuery.Message.RequestedLoadIfMissing()`, `RequestedRevalidation()`, and `RequestedRevalidationOrLoad()` apply their loading rule to the current `AsyncData`. When the rule calls for a request, Query update returns the next Model and a Fetch Command, and the Runtime performs the Command. Otherwise the Query Model is unchanged.
- `RequestedLoadIfStale({ nowMillis })` uses the configured freshness duration. The parent obtains `nowMillis` from an Effect Clock Command and passes it through a Message, so update remains pure.
- `RequestedCancel()` invalidates a pending request and returns a CancelFetch Command for that exact request. It leaves an inactive Query unchanged.
- `RequestedReset()` sets the data to `Idle` and keeps the Query's request generation.

#### Optional Queries

A Query field can be `Schema.Option(PostsQuery)` when the resource exists only in some parent states. The instance is live while it is in the Model. Removing it closes its scope, and putting the same yielded instance back creates a fresh `Idle` Query (or a loading one with `isLoadingOnStart`). A parent can only send Messages to an instance it holds, so a handler matches the `Option` before it sends.

### Read and Render Query Data

Use `read` to access the Query's retained `AsyncData` value:

::Snippet{name="queryReadAndRender" label="Reading and rendering Query data"}

The parent passes `model.posts.model` to `PostsQuery.read`, an accessor the Query owns; it does not inspect the Query Model's fields. `read` returns an ordinary `AsyncData`, and the parent decides how to render it with `AsyncData.match`, `matchData`, `getData`, `getError`, or another Async Data helper. Query has no view, so the parent renders the data itself.

## Load and Refresh Query Data

### Loading Rules

Query has three Messages for loading and refreshing data. Each applies its transition rule to the current `AsyncData` state. When that rule calls for a request, Query update returns the next Model together with the Fetch Command. The Runtime performs that Command after it receives the update result. A first load enters `Loading`; a refresh enters `Refreshing` and keeps the previous data available.

| Current state           | `RequestedLoadIfMissing` | `RequestedRevalidation` | `RequestedRevalidationOrLoad` |
| ----------------------- | ------------------------ | ----------------------- | ----------------------------- |
| `Idle`, `Failure`       | enter `Loading`          | no change               | enter `Loading`               |
| `Loading`, `Refreshing` | no change                | no change               | no change                     |
| `Success`, `Stale`      | no change                | enter `Refreshing`      | enter `Refreshing`            |

The no-change cases return no Command. Sending the same Message again while its Query is pending therefore does not duplicate the request. A KeyedQuery applies this check to the selected entry, so different keys may load concurrently.

### Freshness-Aware Loading

`RequestedLoadIfStale` adds a time check to `RequestedRevalidationOrLoad`. `Success` or `Refreshing` data is fresh while `nowMillis` is before the successful completion time plus `staleTime`, and the Query returns no new Command. A `Success` value at the deadline requests a refresh. `Idle` and `Failure` request an initial load, and `Stale` requests another refresh. A pending request is not duplicated. The default infinite duration treats `Success` and `Refreshing` as fresh, even when older completions have no recorded timestamp.

Read the current time in a Command using Effect Clock and return it in a Message. Calling `Date.now()` in update would make the same Model and Message yield different results. The parent chooses when to check freshness, such as on screen entry or a Subscription tick:

::Snippet{name="queryFreshnessClock" label="Checking Query freshness after a Clock Command"}

Both forms expose `isFresh` for a read-only freshness check: `PostsQuery.isFresh(model.posts.model, nowMillis)` or `PostQuery.isFresh(model.postDetails.model, args, nowMillis)`. It does not update access recency. A KeyedQuery's `RequestedLoadIfStale` takes `{ args, nowMillis }`.

### Settling Completed Requests

#### Accepted Completions

When the Fetch Command finishes, the Runtime delivers its `CompletedFetch` Message to the Query instance that returned the Command. Query then settles the pending value:

- A successful first load becomes `Success`.
- A failed first load becomes `Failure`.
- A successful refresh replaces the retained data and becomes `Success`.
- A failed refresh becomes `Stale`, keeping the previous data beside the error.

Query accepts a completion only when it belongs to the currently pending request. A late completion from older work cannot overwrite a newer result.

#### Optional Parent Notifications

Set `notifyOnCompletion: true` when the parent needs to react after Query accepts and settles a fetch. The Query then has a `CompletedFetch` OutMessage. A KeyedQuery's carries `{ args, generation, result, completedAtMillis? }`; an unkeyed Query's omits `args`. The result carries success or failure. The completion time is optional because a Story or Scene test can resolve a Fetch Command manually without it.

The parent handles the OutMessage with `.on` on the yielded instance. The handler can update parent-owned state, such as a failure notice, without writing inside the Query Model. This example uses the `PostQuery` defined in [Keyed Definition](#keyed-definition) below:

::Snippet{name="queryCompletionPolicy" label="Handling an accepted Query completion"}

The handler runs only for a completion the Query accepted. Canceled, superseded, and duplicate completions emit no OutMessage. `Requested*` Messages emit no OutMessage either. Without `notifyOnCompletion`, the Query has no OutMessage and the parent writes no `.on` handler for it.

#### Development Reloads

:::Warning{label="Development reloads"}
During a Vite development reload, Foldkit can restore the Model but cannot restart Commands that belonged to the previous runtime. A Query restored in `Loading` or `Refreshing` can therefore remain pending until a full browser reload starts the application again. The same limitation applies to any Model state backed by an in-flight Command.
:::

### Choose When the Parent Loads or Refreshes

#### Selecting a Message

Choose the Message that matches why the parent is loading or refreshing:

- Send `RequestedLoadIfMissing` on first entry to a screen or entity when retained data should be reused without a background refresh.
- Send `RequestedRevalidationOrLoad` for a Refresh or Retry action that should work whether data is present or absent.
- Send `RequestedRevalidation` when an event affects only resources that have already loaded. A mutation result or interval tick can refresh visible data without cold-loading every related Query.

#### Automatic Refreshes

Automatic behavior is ordinary Foldkit architecture. For interval refetching, a `subscriptions` entry emits a tick Message while a Model condition is true, and the handler for that Message sends `RequestedRevalidation`. For retries, compose the fetch Effect with Effect's retry and Schedule APIs. To refresh related resources after a mutation, have the handler for the mutation result send the appropriate Message to each affected Query. Query supplies the transition; the parent records the reason and chooses when it happens.

The [API Cache Query example](/example-apps/api-cache-query) shows all three shapes together: a Query loaded when it is created, a KeyedQuery that retains post details by id, and a Query revalidated by a Subscription while its tab is active.

### Reset a Query

Send `RequestedReset` to clear a live Query. Query uses a generation number to reject late completions. `RequestedReset` clears the data and keeps that generation, so a request started afterwards cannot share a generation with work started before the reset.

`RequestedReset` does not interrupt a running Command. A completion that arrives while the reset Query is no longer pending is ignored. Send `RequestedCancel` when the pending work itself should stop: Query update invalidates the current generation and returns a CancelFetch Command that interrupts that exact Fetch. A `Loading` Query becomes `Idle`; a `Refreshing` Query returns to `Success` with its retained data. A late result from the canceled generation is ignored, even if interruption finds no running fiber because cancellation won the startup race.

## Define a KeyedQuery

### Keyed Definition

Add a non-empty `args` record to `Query.define` when one definition should retain independent results for dynamic inputs. This KeyedQuery fetches one `Post` by id, using the same `Post` Schema as `PostsQuery`. It also configures one-minute freshness, a 100-entry settled cache, and parent completion notifications:

::Snippet{name="queryKeyedDefine" label="Defining a KeyedQuery for post details"}

### Per-Key Messages

Adding `args` makes `Query.define` return a KeyedQuery class. Each distinct argument key has its own `AsyncData` entry. Create the instance with `yield* new PostQuery('postDetails', {})`, or pass `{ loadOnStart: [{ postId: '1' }] }` to start fetches for those args when the instance enters the Model. Its Messages carry the arguments they act on:

- `PostQuery.read(model.postDetails.model, { postId })` returns that entry's `AsyncData`, or `Idle` when the entry does not exist.
- `PostQuery.Message.RequestedLoadIfMissing({ args: { postId } })` changes a missing entry to `Loading` and returns its Fetch Command. An entry that already has data is unchanged.
- `RequestedRevalidation({ args })` changes a data-bearing entry to `Refreshing` and returns its Fetch Command. An entry without data is unchanged.
- `RequestedRevalidationOrLoad({ args })` chooses the loading or refreshing transition from that entry's current state.
- `RequestedLoadIfStale({ args, nowMillis })` reuses fresh data and otherwise loads or refreshes that entry.
- `RequestedCancel({ args })` cancels only that entry's pending Fetch. Restoring a canceled refresh applies the settled-entry limit and may evict retained data; other pending keys are unaffected.
- `RequestedReset()` removes every entry.

Send each one with `model.postDetails.send(...)`, as with an unkeyed Query. `PostQuery.pendingArgs(model.postDetails.model)` returns detached snapshots of the arguments for currently pending entries. A parent can inspect those snapshots when it needs to cancel several requests, while choosing which requests matter remains application policy.

### Default Keys

By default, KeyedQuery encodes the complete args value as the key. Object field order does not change the key; array order does. Two argument records with different values retain different entries.

Each `args` field has the same restriction as `data` and `error`: its Schema Codec must require no encoding or decoding services. KeyedQuery encodes args when it derives the default key.

### Request Identity

KeyedQuery snapshots args through their declared Codec before storing them or returning a Fetch Command. It captures the canonical cache key for that request once. The completion Message carries that key, so settling the request does not recompute `toKey` from args that may have changed.

The stored args and the handler's args are separate decoded values. This protects fields reconstructed by the declared Codec; an opaque value accepted by a Schema such as `Schema.Unknown` can retain its original identity. Keep opaque argument values immutable for the duration of the request.

### Custom Keys

Provide `toKey` when several argument values deliberately identify the same retained resource. Suppose the args are `{ postId: Schema.String, preview: Schema.Boolean }`, but `preview` changes only how the request is made. `toKey: ({ postId }) => postId` makes the preview and non-preview requests share one entry. A collision means sharing data and pending work, so omit a field only when that is the application's intended identity rule.

### Freshness and Retention Limits

Set `staleTime` to control when a parent-requested freshness check revalidates a successful entry. The duration starts when the fetch succeeds, not when it starts or when an entry is reused. A cache hit does not extend that deadline. An expired entry remains readable while a refresh runs, until a success replaces it, reset clears it, or capacity eviction removes it.

Set `maxSettledEntries` to a positive safe integer to bound retained settled entries. Requests and cache hits update access recency; accepted completions admit settled results and evict the least recently used settled entries above the limit. Canceling a first load removes its empty entry; canceling a refresh restores its retained `Success` and applies the settled-entry limit. Other pending entries are protected, so enough concurrent requests can temporarily put the total entry count above the bound. `read` and `isFresh` do not change recency. The default has no capacity limit. Neither option schedules a timer or removes an entry merely because its freshness duration passes.

The KeyedQuery definition above configures both policies. It keeps at most 100 settled post entries and refreshes a retained post only when the parent checks it after one minute.

The parent still chooses the requested keys, viewport pages, retry timing, and how fetched data is displayed. A bounded KeyedQuery is one cache of per-key `AsyncData` values; it does not merge several keys into one domain collection or decide which key should be visible.

## Test Query Commands

`PostsQuery.Fetch` is public so Story and Scene tests can match and resolve the Command: `Command.resolve(PostsQuery.Fetch, PostsQuery.Message.CompletedFetch({ generation, result }))`. Obtain application Fetch Commands by sending a `Requested*` Message. Returning `Fetch` directly from a parent would skip the Model transition and generation update that make completion handling safe.

KeyedQuery's Fetch args and `CompletedFetch` Message include `requestKey` alongside `args` and `generation`. Query update supplies it. When manually resolving a Fetch Command, copy its `requestKey` into the completion Message; do not recompute the key. Supply `completedAtMillis` in manually resolved successful completions when a finite `staleTime` matters. The [API Cache Query example](/example-apps/api-cache-query) includes Story and Scene tests that resolve Query Commands without running their Effects.

## When to Use AsyncData Directly

Query fits a request whose result becomes one retained resource, or one entry in a retained collection, and whose lifecycle follows the standard loading, refreshing, failure, and stale states. A completion OutMessage can also advance a parent workflow or update parent fields. Use `AsyncData` directly when the owning Block must control the request lifecycle and reconcile its result with other state, or when cache admission and eviction rules differ from KeyedQuery's settled-entry recency policy. The checkout below illustrates an application-owned request loop; a Query whose parent handles its `CompletedFetch` OutMessage is another option when Query can own the order's retained value.

### Application-Specific Results

#### Domain Command

In this checkout, placing the order does more than retain the returned value. The `Orders` service's `place(orderDraft)` submits an order. The application defines its result Messages and a `SubmitOrder` Command around that domain operation:

::Snippet{name="queryUseAsyncDataCommand" label="Defining the order Command and Messages"}

#### Domain Update

The checkout Block's Model owns the `AsyncData` field. Its `SubmitOrder` handler calls `orders.place`, and its update handlers treat each result as part of the larger checkout transition. Success stores the order and moves the application to its confirmation route:

::Snippet{name="queryUseAsyncDataUpdate" label="Handling order results in the checkout Block"}

The [Async Data guide](/core/async-data) covers the state type, transitions, and rendering helpers used when the application owns this wiring.

The [Query API reference](/api-reference/experimental-query) lists the exact `define`, Query class, KeyedQuery class, Message, `read`, `toLayer`, and `run` signatures.
