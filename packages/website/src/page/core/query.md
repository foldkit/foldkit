# Query

:::Warning{label="Experimental"}
Query ships from `foldkit/experimental`. Its fetch and retention model is usable today, but names, types, Model shape, and lifecycle APIs may change before the module moves into Foldkit's stable API.
:::

:::Info{label="See it in an app"}
To see how Query is used in a complete Foldkit application, visit [API Cache Query](/example-apps/api-cache-query). It includes a Query loaded during init, a KeyedQuery loaded by id, refreshes driven by a Subscription, and Story and Scene tests.
:::

## Overview

Fetching data in a Foldkit application usually takes the same pieces: an [AsyncData](/core/async-data) value in the Model, a Command that performs the request, a Message carrying the result, and update branches that begin and settle the request. That explicit loop is useful when a request belongs to a larger workflow. It becomes repetitive when the application only needs to retain a resource and refresh it later.

Think of Query as that standard request loop packaged around an `AsyncData` value. Query is a viewless Submodel: it owns the `AsyncData` state, fetch Command, completion Message, update logic, and protection against late responses. The parent stores the Query Model, delegates its Messages, and reads the retained `AsyncData` value for rendering.

A Query retains one resource, such as the current account or a list of posts. A KeyedQuery uses the same definition to retain separate entries for arguments such as post ids. Both keep successful data available while a refresh is pending or fails.

### When to Use Query

Use Query when a request produces one retained resource, or one entry in a retained collection, and the standard loading, refreshing, failure, and stale states describe its lifecycle. Use `AsyncData` directly when the result belongs to a larger application-specific transition, such as advancing a checkout or updating several Model fields. [When to Use AsyncData Directly](#when-to-use-asyncdata-directly) develops that distinction with an example.

### The Parent Controls Loading and Refreshing

The parent controls when a Query loads or refreshes. In response to one of its Messages—for example, a route change, button click, mutation result, or Subscription tick—it calls `loadIfMissing`, `revalidate`, or `revalidateOrLoad`. The Query operation checks the current `AsyncData` state and returns an update result containing either the unchanged Model or the next Model and a fetch Command.

Query does not react to rendering, expire data after a duration, poll, or refresh related resources on its own. The parent owns those decisions and expresses them through its Messages, update branches, and Subscriptions.

## Define a Query

Import the `Query` namespace from `foldkit/experimental`. Define the data and error Schemas, give the fetch a name, and provide the Effect that performs it:

::Snippet{name="queryDefine" label="Defining a Query for posts"}

With no `args`, `Query.define` returns a Query that retains one value. In this definition:

- `data` and `error` determine the `AsyncData` and Message Schemas.
- `execute` is the Effect the Runtime performs when it runs the generated fetch Command.
- `name: 'Posts'` gives the generated Command the name `FetchPosts` in DevTools and tests.

The `data` and `error` values must be Schema Codecs that require no encoding or decoding services. Query uses them to build its Model and completion Message Schemas.

The returned `postsQuery` owns a Model Schema, a Message union, and operations over that Model. Put `postsQuery.Model` in the parent Model Schema and use `postsQuery.init()` only when constructing the initial parent Model. The initial value is `Idle`.

### Connect the Query to Its Parent

The parent wraps the Query's Message and routes that wrapper back through a lifted fold. `lift` also adapts the loading operations so they read and write the Query field inside the parent Model:

::Snippet{name="queryLift" label="Connecting Query to its parent"}

The `parentField` form tells `lift` which field contains an always-present Query Model. `toParentMessage` wraps the result Message produced by the Query's fetch Command in the parent's `Got*Message` variant. `lift` returns the child fold and Query operations expressed in the parent Model and Message types. These functions return ordinary update results; they do not perform Effects.

- `posts.fold(model, message)` delegates the child Message to Query's update and writes the returned Query Model back to `model.posts`.
- `posts.loadIfMissing`, `posts.revalidate`, and `posts.revalidateOrLoad` apply their loading rule to the current `AsyncData`. When the rule calls for a request, the update result contains the next parent Model and a `FetchPosts` Command. Otherwise it contains only the unchanged Model.
- `posts.reset(model)` returns an update result whose parent Model contains an `Idle` Query value while preserving the Query's request identity.

Use the full lens form of `lift` when the Query is nested or exists only in some parent variants. Supply `read`, `write`, and `toParentMessage`, following the same contract as [`Update.foldChild`](/core/submodel#fold-child). When `read` returns `None`, the fold and lifted operations return the parent Model unchanged and no Commands.

Call a loading operation from init or a parent Message handler. In the example, init constructs the complete parent Model and passes it to `posts.loadIfMissing`. A route-change handler can return the same operation when a screen becomes active. Rendering the screen does not return a fetch Command or cause a request.

### Read and Render Query Data

Use `read` to access the Query's retained `AsyncData` value:

::Snippet{name="queryReadAndRender" label="Reading and rendering Query data"}

The parent passes the Query Model to a child-owned accessor; it does not inspect the Query Model's fields. `read` returns an ordinary `AsyncData`, and the parent decides how to render it with `AsyncData.match`, `matchData`, `getData`, `getError`, or another Async Data helper. A viewless Submodel preserves the state and update boundary without creating an `h.submodel` view boundary.

## Load and Refresh Query Data

Query provides three operations for loading and refreshing data. Each operation applies its transition rule to the current `AsyncData` state. When that rule calls for a request, the operation returns the next Model together with the fetch Command. The Runtime performs that Command after it receives the update result. A first load enters `Loading`; a refresh enters `Refreshing` and keeps the previous data available.

| Current state           | `loadIfMissing` | `revalidate`       | `revalidateOrLoad` |
| ----------------------- | --------------- | ------------------ | ------------------ |
| `Idle`, `Failure`       | enter `Loading` | no change          | enter `Loading`    |
| `Loading`, `Refreshing` | no change       | no change          | no change          |
| `Success`, `Stale`      | no change       | enter `Refreshing` | enter `Refreshing` |

The no-change cases return no Command. Calling the same operation again while its Query is pending therefore does not duplicate the request. A KeyedQuery applies this check to the selected entry, so different keys may load concurrently.

When the Command finishes, the Runtime dispatches Query's `CompletedFetch` Message through `toParentMessage`. The parent wrapper branch calls `fold`, and Query settles the pending value:

- A successful first load becomes `Success`.
- A failed first load becomes `Failure`.
- A successful refresh replaces the retained data and becomes `Success`.
- A failed refresh becomes `Stale`, keeping the previous data beside the error.

Query accepts a completion only when it belongs to the currently pending request. A late completion from older work cannot overwrite a newer result.

:::Warning{label="Development reloads"}
During a Vite development reload, Foldkit can restore the Model but cannot restart Commands that belonged to the previous runtime. A Query restored in `Loading` or `Refreshing` can therefore remain pending until a full browser reload starts the application again. The same limitation applies to any Model state backed by an in-flight Command.
:::

### Choose When the Parent Loads or Refreshes

Choose the operation that matches why the parent is loading or refreshing:

- Use `loadIfMissing` on first entry to a screen or entity when retained data should be reused without a background refresh.
- Use `revalidateOrLoad` for a Refresh or Retry action that should work whether data is present or absent.
- Use `revalidate` when an event affects only resources that have already loaded. A mutation result or interval tick can refresh visible data without cold-loading every related Query.

Automatic behavior is still ordinary Foldkit architecture. For interval refetching, a [Subscription](/core/subscriptions) dispatches a tick Message while a Model condition is true, and that Message calls `revalidate`. For retries, compose `execute` with Effect's retry and Schedule APIs. To refresh related resources after a mutation, have the mutation result Message call the appropriate loading operation for each affected Query. Query supplies the transition; the parent records the reason and chooses when it happens.

The [API Cache Query example](/example-apps/api-cache-query) shows all three shapes together: a Query loaded at startup, a KeyedQuery that retains post details by id, and a Query revalidated by a Subscription while its tab is active.

### Reset a Query

Call `reset` to clear a live Query. Do not replace a live Query Model with a fresh result from `init()`. Query uses a generation number to reject late completions. `reset` clears the data while preserving that request identity, so a request started afterwards cannot share a generation with work started before the reset.

`reset` does not interrupt a running Command. A completion that arrives while the reset Query is no longer pending is ignored. If the application needs the work itself to stop, use a hand-managed interruptible Command instead of relying on reset as cancellation.

## Define a KeyedQuery

Add a non-empty `args` record to `Query.define` when one definition should retain independent results for dynamic inputs. In this example, `fetchPost(postId)` is an Effect that fetches and decodes one `Post` using the same pattern as `fetchPosts` above:

::Snippet{name="queryKeyedDefine" label="Defining a KeyedQuery for post details"}

Adding `args` makes `Query.define` return a KeyedQuery. Each distinct argument key has its own `AsyncData` entry. The operations now receive the arguments they should act on:

- `postQuery.read(model.postDetails, { postId })` returns that entry's `AsyncData`, or `Idle` when the entry does not exist.
- `postDetails.loadIfMissing(model, { postId })` changes a missing entry to `Loading` and includes its fetch Command in the update result. An entry that already has data is unchanged.
- `postDetails.revalidate(model, { postId })` changes a data-bearing entry to `Refreshing` and includes its fetch Command. An entry without data is unchanged.
- `postDetails.revalidateOrLoad(model, { postId })` chooses the loading or refreshing transition from that entry's current state.

By default, KeyedQuery encodes the complete args value as the key. Object field order does not change the key; array order does. Two argument records with different values retain different entries.

Each `args` field has the same restriction as `data` and `error`: its Schema Codec must require no encoding or decoding services. KeyedQuery encodes args when it derives the default key.

Provide `toKey` when several argument values deliberately identify the same retained resource. Suppose the args are `{ postId: Schema.String, preview: Schema.Boolean }`, but `preview` changes only how the request is made. `toKey: ({ postId }) => postId` makes the preview and non-preview requests share one entry. A collision means sharing data and pending work, so omit a field only when that is the application's intended identity rule.

A KeyedQuery retains entries until `reset` clears all of them. It does not currently expire entries, cap their number, or remove one key. Use it for a set whose lifetime and size fit the parent Model. Manage a different cache shape directly when entries need individual eviction or another retention policy.

## Test Query Commands

The generated `Fetch` definition is public so Story and Scene tests can match and resolve the Command. Obtain application fetch Commands through `loadIfMissing`, `revalidate`, or `revalidateOrLoad`; calling `Fetch` directly would skip the Model transition and generation update that make completion handling safe.

The [API Cache Query example](/example-apps/api-cache-query) includes Story and Scene tests that resolve Query Commands without running their Effects.

## When to Use AsyncData Directly

Query fits a request whose result becomes one retained resource, or one entry in a retained collection, and whose lifecycle follows the standard loading, refreshing, failure, and stale states. Use `AsyncData` directly when the request result belongs to a larger application-specific transition. Common examples include success and failure driving different domain flows, one result updating several Model fields, user-controlled interruption, or a cache with its own eviction rules.

In this checkout, placing the order does more than retain the returned value. `Orders.place(orderDraft)` is the checkout's Effect for submitting an order. The application defines its result Messages and Command around that domain operation:

::Snippet{name="queryUseAsyncDataCommand" label="Defining the order Command and Messages"}

The Model owns the `AsyncData` field, and update handles each result as part of the larger checkout transition. Success stores the order and moves the application to its confirmation route:

::Snippet{name="queryUseAsyncDataUpdate" label="Handling order results in update"}

The [Async Data guide](/core/async-data) covers the state type, transitions, and rendering helpers used when the application owns this wiring.

The [Query API reference](/api-reference/experimental-query) lists the exact Query, KeyedQuery, `define`, `lift`, `read`, `reset`, and `run` signatures.
