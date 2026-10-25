# Query

:::Warning{label="Experimental"}
Query ships from `foldkit/experimental`. Its fetch and retention model is usable today, but names, types, Model shape, and lifecycle APIs may change before the module moves into Foldkit's stable API.
:::

:::Info{label="See it in an app"}
To see how Query is used in a complete Foldkit application, visit [API Cache Query](/example-apps/api-cache-query). It includes a Query loaded during init, a KeyedQuery loaded by id, refreshes driven by a Subscription, and Story and Scene tests.
:::

## Overview

### Viewless Request State

Fetching data in a Foldkit application usually takes the same pieces: an [AsyncData](/core/async-data) value in the Model, a Command that performs the request, a Message carrying the result, and update branches that begin and settle the request. That explicit loop is useful when a request belongs to a larger workflow. It becomes repetitive when the application only needs to retain a resource and refresh it later.

Think of Query as that standard request loop packaged around an `AsyncData` value. Query is a viewless Block: it owns the `AsyncData` state, fetch Command, completion Message, update logic, and protection against late responses. The parent stores the Query Model, delegates its Messages, and reads the retained `AsyncData` value for rendering.

### Query and KeyedQuery

A Query retains one resource, such as the current account or a list of posts. A KeyedQuery uses the same definition to retain separate entries for arguments such as post ids. Both keep successful data available while a refresh is pending or fails.

### When to Use Query

Use Query when a request produces one retained resource, or one entry in a retained collection, and the standard loading, refreshing, failure, and stale states describe its lifecycle. Use `AsyncData` directly when the result belongs to a larger application-specific transition, such as advancing a checkout or updating several Model fields. [When to Use AsyncData Directly](#when-to-use-asyncdata-directly) develops that distinction with an example. When the server pushes changes to the data as a numbered stream, use [LiveQuery](/core/live-query) instead.

### The Parent Controls Loading and Refreshing

The parent controls when a Query loads or refreshes. In response to one of its Messages—for example, a route change, button click, mutation result, or Subscription tick—it calls `requestLoadIfMissing`, `requestRevalidation`, or `requestRevalidationOrLoad`. The Query operation checks the current `AsyncData` state and returns an update result containing either the unchanged Model or the next Model and a fetch Command.

Query does not react to rendering, expire data after a duration, poll, or refresh related resources on its own. The parent owns those decisions and expresses them through its Messages, update branches, and Subscriptions.

## Define a Query

### Definition Fields

#### Configuration

Import the `Query` namespace from `foldkit/experimental`. Define the data and error Schemas and fetch name in the config, then attach the implementation through `config.handler`:

::Snippet{name="queryDefine" label="Defining a Query for posts"}

With no `args`, `Query.define` returns a Query that retains one value. In this definition:

- `data` and `error` determine the `AsyncData` and Message Schemas.
- The `handler` generator constructs the fetch function. The completed Query carries its handler recipe in `EffectsLayer`.
- `name: 'Posts'` names the Query Block. Its local `Fetch` Command is qualified by the Block and its parent placement.

Bind the completed Query through the parent Definition and include the Binding in the parent's Composition `bindings`. The Binding carries the Query's handler recipe automatically; do not add it to the parent's local `EffectsLayer`. The entry supplies ordinary service providers through `ApplicationLayer`. The handler generator captures stable services when the Runtime builds its Layer, and the fetch function uses those services for each request.

Omit `handler` when an external host supplies the fetch implementation. Complete that Query with `query.provideHandlers(query.toLayer(constructor))` before binding it into a runnable application. `toLayer` accepts an Effect constructor and can also provide an alternative to an attached handler. For direct `query.run` outside application composition, provide `query.EffectsLayer` to the Effect. Ordinary execution tests retain the handler and replace its underlying services.

The `data` and `error` values must be Schema Codecs that require no encoding or decoding services. Query uses them to build its Model and completion Message Schemas.

#### Returned Definition

The returned `postsQuery` is a completed viewless Block with a Model Schema, a Message union, and public operations. Each operation produces a Query-owned `Requested*` Message that the completed Block passes through Query update synchronously. Put `postsQuery.Model` in the parent Model Schema and bind it through the parent Definition. Its zero-argument initializer starts the required direct field automatically. Put `PostsBinding.requestLoadIfMissing()` in the Composition init plan's `steps` array to begin the first request after the Query Model exists.

### Bind the Query to Its Parent

Composition derives delivery for the Query's Messages from its registered Binding. `makeBinding` also projects the loading operations so they read and write the Query field inside the parent Model:

::Snippet{name="queryLift" label="Binding Query to its parent"}

#### Binding Configuration

The `field` form tells `makeBinding` which exact field contains the Query Model or `Option<QueryModel>`. Composition derives a `Got*Message` envelope carrying the Binding's placement and originating instance generation; parents do not declare a wrapper or supply a Message mapper. The Binding returns the child fold and Query operations expressed in the parent Model and Message types. Its projected operations return connected Steps whose Model input requires the registering Composition's graph. Apply them inside `makeUpdate`, include them in `makeInit` startup, or preserve them through a Definition-owned Step. Return or compose their opaque results intact; the Composition consumes them during checked execution. They do not perform Effects.

#### Bound Operations

- The parent Composition routes each generated Query delivery through the registered Binding and writes the returned Query Model back to `model.posts`.
- `PostsBinding.requestLoadIfMissing()`, `PostsBinding.requestRevalidation()`, and `PostsBinding.requestRevalidationOrLoad()` return connected parent Steps that apply their loading rule to the current `AsyncData`. Their connected results expose no `.model` or `.commands` before the Composition consumes them. After checked execution, a requested load produces the readable next parent Model and the Query's `Fetch` Command; otherwise the readable result contains only the unchanged Model.
- `PostsBinding.requestReset()` returns a connected parent Step. After checked execution, the Query value is `Idle` and retains its request identity. Its type still carries Query update's complete Fetch handler requirements even though reset itself returns no Fetch Command.

#### Optional and Nested Queries

Use `field` when an optional Query occupies an exact Option field. After checked execution, its bound operations produce the unchanged parent Model and no Commands while the field is `None`; they never insert a missing Query Model. Add `presentWhen` when a parent condition governs the whole direct child while retaining its stored Model. Use explicit `read` and `write` when the Query is nested, spans tagged parent variants, or needs a custom write. When `read` returns `None`, it has the same absent behavior.

#### Starting a Load

Call a loading operation from init or a parent Message handler. In the example, `requestLoadIfMissing` is a startup Step. A route-change handler can return the same operation when a screen becomes active. Rendering the screen does not return a fetch Command or cause a request.

### Read and Render Query Data

Use `read` to access the Query's retained `AsyncData` value:

::Snippet{name="queryReadAndRender" label="Reading and rendering Query data"}

The parent passes the Query Model to a child-owned accessor; it does not inspect the Query Model's fields. `read` returns an ordinary `AsyncData`, and the parent decides how to render it with `AsyncData.match`, `matchData`, `getData`, `getError`, or another Async Data helper. A viewless Block preserves the state and update boundary without creating an `h.block` view boundary.

## Load and Refresh Query Data

### Loading Rules

Query provides three operations for loading and refreshing data. Each operation applies its transition rule to the current `AsyncData` state. When that rule calls for a request, the operation returns the next Model together with the fetch Command. The Runtime performs that Command after it receives the update result. A first load enters `Loading`; a refresh enters `Refreshing` and keeps the previous data available.

| Current state           | `requestLoadIfMissing` | `requestRevalidation` | `requestRevalidationOrLoad` |
| ----------------------- | ---------------------- | --------------------- | --------------------------- |
| `Idle`, `Failure`       | enter `Loading`        | no change             | enter `Loading`             |
| `Loading`, `Refreshing` | no change              | no change             | no change                   |
| `Success`, `Stale`      | no change              | enter `Refreshing`    | enter `Refreshing`          |

The no-change cases return no Command. Calling the same operation again while its Query is pending therefore does not duplicate the request. A KeyedQuery applies this check to the selected entry, so different keys may load concurrently.

### Settling Completed Requests

#### Accepted Completions

When the Command finishes, the Runtime dispatches Query's `CompletedFetch` Message through the registered Binding's generated envelope. The envelope retains the originating occurrence, and Composition invokes the Binding fold only while that occurrence remains current. Query then settles the pending value:

- A successful first load becomes `Success`.
- A failed first load becomes `Failure`.
- A successful refresh replaces the retained data and becomes `Success`.
- A failed refresh becomes `Stale`, keeping the previous data beside the error.

Query accepts a completion only when it belongs to the currently pending request. A late completion from older work cannot overwrite a newer result.

#### Development Reloads

:::Warning{label="Development reloads"}
During a Vite development reload, Foldkit can restore the Model but cannot restart Commands that belonged to the previous runtime. A Query restored in `Loading` or `Refreshing` can therefore remain pending until a full browser reload starts the application again. The same limitation applies to any Model state backed by an in-flight Command.
:::

### Choose When the Parent Loads or Refreshes

#### Selecting an Operation

Choose the operation that matches why the parent is loading or refreshing:

- Use `requestLoadIfMissing` on first entry to a screen or entity when retained data should be reused without a background refresh.
- Use `requestRevalidationOrLoad` for a Refresh or Retry action that should work whether data is present or absent.
- Use `requestRevalidation` when an event affects only resources that have already loaded. A mutation result or interval tick can refresh visible data without cold-loading every related Query.

#### Automatic Refreshes

Automatic behavior is still ordinary Foldkit architecture. For interval refetching, a [Subscription](/core/subscriptions) dispatches a tick Message while a Model condition is true, and that Message calls `requestRevalidation`. For retries, compose the fetch Effect with Effect's retry and Schedule APIs. To refresh related resources after a mutation, have the mutation result Message call the appropriate loading operation for each affected Query. Query supplies the transition; the parent records the reason and chooses when it happens.

The [API Cache Query example](/example-apps/api-cache-query) shows all three shapes together: a Query loaded at startup, a KeyedQuery that retains post details by id, and a Query revalidated by a Subscription while its tab is active.

### Reset a Query

Call `requestReset` to clear a live Query. Do not replace a live Query Model with a fresh result from `init()`. Query uses a generation number to reject late completions. `requestReset` clears the data while preserving that request identity, so a request started afterwards cannot share a generation with work started before the reset.

`requestReset` does not interrupt a running Command. A completion that arrives while the reset Query is no longer pending is ignored. If the application needs the work itself to stop, use a hand-managed interruptible Command instead of relying on reset as cancellation.

## Define a KeyedQuery

### Keyed Definition

Add a non-empty `args` record to `Query.define` when one definition should retain independent results for dynamic inputs. In this example, `fetchPost(postId)` is an Effect that fetches and decodes one `Post` using the same pattern as `fetchPosts` above:

::Snippet{name="queryKeyedDefine" label="Defining a KeyedQuery for post details"}

### Per-Key Operations

Adding `args` makes `Query.define` return a KeyedQuery. Each distinct argument key has its own `AsyncData` entry. Bind `postQuery` to the parent’s `postDetails` field as `PostDetailsBinding`, following the parent-binding pattern above. Its operations receive the arguments they should act on:

- `postQuery.read(model.postDetails, { postId })` returns that entry's `AsyncData`, or `Idle` when the entry does not exist.
- `PostDetailsBinding.requestLoadIfMissing({ postId })(model)` changes a missing entry to `Loading` and includes its fetch Command in the update result. An entry that already has data is unchanged.
- `PostDetailsBinding.requestRevalidation({ postId })(model)` changes a data-bearing entry to `Refreshing` and includes its fetch Command. An entry without data is unchanged.
- `PostDetailsBinding.requestRevalidationOrLoad({ postId })(model)` chooses the loading or refreshing transition from that entry's current state.

### Default Keys

By default, KeyedQuery encodes the complete args value as the key. Object field order does not change the key; array order does. Two argument records with different values retain different entries.

Each `args` field has the same restriction as `data` and `error`: its Schema Codec must require no encoding or decoding services. KeyedQuery encodes args when it derives the default key.

### Request Identity

KeyedQuery snapshots args through their declared Codec before storing them or returning a Fetch Command. It captures the canonical cache key for that request once. The completion Message carries that key, so settling the request does not recompute `toKey` from args that may have changed.

The stored args and the handler's args are separate decoded values. This protects fields reconstructed by the declared Codec; an opaque value accepted by a Schema such as `Schema.Unknown` can retain its original identity. Keep opaque argument values immutable for the duration of the request.

### Custom Keys

Provide `toKey` when several argument values deliberately identify the same retained resource. Suppose the args are `{ postId: Schema.String, preview: Schema.Boolean }`, but `preview` changes only how the request is made. `toKey: ({ postId }) => postId` makes the preview and non-preview requests share one entry. A collision means sharing data and pending work, so omit a field only when that is the application's intended identity rule.

### Retention Limits

A KeyedQuery retains entries until `requestReset` clears all of them. It does not currently expire entries, cap their number, or remove one key. Use it for a set whose lifetime and size fit the parent Model. Manage a different cache shape directly when entries need individual eviction or another retention policy.

## Test Query Commands

The generated `Fetch` definition is public so Story and Scene tests can match and resolve the Command. Obtain application fetch Commands through `requestLoadIfMissing`, `requestRevalidation`, or `requestRevalidationOrLoad`; calling `Fetch` directly would skip the Model transition and generation update that make completion handling safe.

KeyedQuery's generated Fetch args and `CompletedFetch` Message include `requestKey` alongside `args` and `generation`. Loading operations supply it automatically. When manually resolving a Fetch Command, copy its `requestKey` into the completion Message; do not recompute the key. The [API Cache Query example](/example-apps/api-cache-query) includes Story and Scene tests that resolve Query Commands without running their Effects.

## When to Use AsyncData Directly

Query fits a request whose result becomes one retained resource, or one entry in a retained collection, and whose lifecycle follows the standard loading, refreshing, failure, and stale states. Use `AsyncData` directly when the request result belongs to a larger application-specific transition. Common examples include success and failure driving different domain flows, one result updating several Model fields, user-controlled interruption, or a cache with its own eviction rules.

### Application-Specific Results

#### Domain Command

In this checkout, placing the order does more than retain the returned value. `Orders.place(orderDraft)` is the checkout's Effect for submitting an order. The application defines its result Messages and Command around that domain operation:

::Snippet{name="queryUseAsyncDataCommand" label="Defining the order Command and Messages"}

#### Domain Update

The Model owns the `AsyncData` field, and update handles each result as part of the larger checkout transition. Success stores the order and moves the application to its confirmation route:

::Snippet{name="queryUseAsyncDataUpdate" label="Handling order results in update"}

The [Async Data guide](/core/async-data) covers the state type, transitions, and rendering helpers used when the application owns this wiring.

The [Query API reference](/api-reference/experimental-query) lists the exact Query, KeyedQuery, `define`, Block, `read`, operation, and `run` signatures.
