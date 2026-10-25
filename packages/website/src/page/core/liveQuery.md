# LiveQuery

:::Warning{label="Experimental"}
LiveQuery ships from `foldkit/experimental`. Its feed and retention model is usable today, but names, types, Model shape, and lifecycle APIs may change before the module moves into Foldkit's stable API.
:::

## Overview

### Retaining a Live Feed

Some data does not arrive once. A server keeps it up to date and pushes every change: an order board that a whole team edits, a document synchronized over a WebSocket, or an event-sourced read model. To show that data, an application needs the same pieces every time: a [Subscription](/core/subscriptions) that opens the stream, a Message for each entry, a Model field with the latest state, and a cursor that records the last entry applied. When the stream restarts, a reconnect must resume after the cursor, and an entry the server sends again must not be applied twice.

Think of LiveQuery as that feed loop packaged around an [AsyncData](/core/async-data) value. LiveQuery is a viewless Block. For each watched feed, it owns the retained `AsyncData`, the cursor, and the connection state. One Subscription streams every watched feed. The parent decides which feeds to watch and when to pause or resume them, reads the retained state for rendering, and reacts to the `AppliedEntry` OutMessage.

### Entries and Cursors

A feed is a Stream of entries. Each entry carries three values:

- `seq`: a sequence number that increases with each change to the feed.
- `state`: the complete state after the change. It is not a delta, so LiveQuery replaces the retained state with it.
- `meta`: optional metadata that LiveQuery reports to the parent, such as the id of the user intent that caused the change.

LiveQuery applies an entry only when its `seq` is greater than the feed's cursor. An entry at or below the cursor does not change the retained state and produces no OutMessage. A stream that repeats entries after a restart therefore leaves the state as it was.

### Connection States

Each feed has a `Connection` state:

- `Connecting`: the feed Stream started or restarted and has delivered no entry in this session yet.
- `Live`: the feed Stream delivered at least one entry in this session.
- `Offline`: the feed is paused, or its Stream ended.
- `Failed`: the feed Stream failed. The error is in the feed's `AsyncData`.

LiveQuery cannot see a connection before the first entry arrives, so a feed stays `Connecting` until then. A backend that resumes after a cursor can send the entry at that cursor first. LiveQuery does not apply that entry again, but it marks the feed `Live`.

### When to Use LiveQuery

Use LiveQuery when a backend pushes the complete state of a resource as numbered entries and the application must keep the latest state across reconnects. Use [Query](/core/query) when the application asks for data and receives one response per request. Use a Subscription directly when the stream has no cursor, for example a presence count where the latest value replaces the last one. [When to Use a Subscription Directly](#when-to-use-a-subscription-directly) shows that path.

## Define a LiveQuery

### Definition Fields

Import the `LiveQuery` namespace from `foldkit/experimental`. Declare the Schemas and the feed arguments, then attach the implementation through `config.handler`:

::Snippet{name="liveQueryDefine" label="Defining a LiveQuery for an order board"}

In this definition:

- `state` and `error` determine the retained `AsyncData` value for each feed.
- `meta` is the Schema of the metadata in each entry. Omit it when entries carry no metadata.
- `args` declares the arguments that select one feed. By default LiveQuery derives the feed key by canonically encoding the args. Provide `toKey` when several argument values identify the same feed.
- `name: 'OrderBoard'` names the LiveQuery Block. Its `Feeds` Subscription is qualified by the Block and its parent placement.

`BoardEvents` is an application Service that opens the backend's entry stream. The handler generator captures it when the Runtime builds the LiveQuery's Layer. The returned function opens one feed. It receives the feed args and the cursor to resume after. That cursor is `None` on a cold start.

The completed LiveQuery carries its handler recipe in `EffectsLayer`. Every Service that the handler yields or that its Stream requires becomes a requirement of the completed Block and of every parent that binds it. When the root `ApplicationLayer` does not provide `BoardEvents`, TypeScript rejects starting the Program. The error appears at compile time, not when the feed opens.

### Host-Provided Handlers

Omit `handler` when a host supplies the feed implementation. Complete the LiveQuery with `provideHandlers` and `toLayer` before binding it into a runnable application:

::Snippet{name="liveQueryHostHandler" label="Supplying the feed handler from a host"}

`toLayer` accepts an Effect constructor. It can also supply an alternative to an attached handler.

### Bind the LiveQuery to Its Parent

Bind the completed LiveQuery through the parent Definition and include the Binding in the parent's Composition `bindings`. LiveQuery declares an OutMessage, so the Binding also takes an OutMessage policy:

::Snippet{name="liveQueryBinding" label="Binding a LiveQuery to its parent"}

- The Binding carries the LiveQuery's handler recipe automatically. Do not add it to the parent's local `EffectsLayer`.
- `BoardBinding.requestWatch({ args })` in the init plan's `steps` starts the feed after the LiveQuery Model exists. `maybeSnapshot` is optional and defaults to `None`.
- `BoardBinding.requestPause()` and `BoardBinding.requestResume()` return connected parent Steps. Apply them inside `makeUpdate`.
- The fold handles `AppliedEntry`. In this example, each applied entry confirms an optimistic intent by removing its id from `pendingIntentIds`.

### Read and Render Feed State

Use `read` to access the retained `AsyncData` value of one feed, and `readConnection` for its connection state:

::Snippet{name="liveQueryReadAndRender" label="Reading and rendering a feed"}

The parent passes the LiveQuery Model to these child-owned accessors. It does not inspect the LiveQuery Model's fields. `read` returns `Idle` for a feed that is not watched. `readConnection` and `readCursor` return `None` for it.

## Watch, Pause, and Resume Feeds

### Operations

The parent calls these operations in response to its own Messages. Each operation returns the next LiveQuery Model. None of them returns a Command. The Runtime starts, restarts, or stops the `Feeds` Subscription when the Subscription dependencies change.

| Operation        | Result                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestWatch`   | Adds the feed. Without a snapshot, its data is `Loading` and its Stream starts with no cursor.                                                    |
| `requestUnwatch` | Removes the feed and its retained state.                                                                                                          |
| `requestPause`   | Stops every feed Stream and marks each streaming feed `Offline`. LiveQuery keeps the data and cursors. A feed with no data yet returns to `Idle`. |
| `requestResume`  | Restarts every watched feed after its cursor, including `Offline` and `Failed` feeds. A feed without data returns to `Loading`.                   |

`requestWatch` leaves a feed that is already watched unchanged. A feed watched while the LiveQuery is paused starts `Idle` and `Offline`, and opens on `requestResume`.

`Loading` therefore means that a Stream is open and has not delivered an entry yet. A feed with no data whose Stream is not open is `Idle`, `Failure`, or not watched.

### Hydrate from a Snapshot

A cold start shows `Loading` until the first entry arrives. When the application already has the state of a feed, for example from a server render, pass it as a snapshot. A snapshot is the state and the cursor it is valid at:

::Snippet{name="liveQuerySnapshot" label="Hydrating a feed from Flags"}

With a snapshot, the feed's data starts as `Success`, and its Stream resumes after the snapshot cursor. The page renders the board immediately and shows no loading state.

### Restarts and Deduplication

The `Feeds` Subscription's dependencies list each streaming feed with its args, the cursor to resume after, and a generation. The dependencies change only when the set of feeds changes: a watch, an unwatch, a pause, a resume, or a feed that fails or ends. An applied entry moves the cursor but does not change the dependencies, so it never restarts the Stream.

When the dependencies change, the Runtime replaces the running Stream, so every streaming feed restarts after its current cursor in a new generation. LiveQuery ignores an entry, failure, or end from an older generation.

All feeds share this one Stream. A watch, an unwatch, or a feed that fails or ends therefore reconnects every other streaming feed too. Each reconnected feed resumes after its cursor, so its data stays correct, but the backend sees new connections. Use separate LiveQuery definitions for feeds that change often and must not interrupt each other.

Together with the cursor check, the restarts give these results:

- No entry is lost, if the handler honors `maybeAfter`. A restarted feed passes its cursor to the handler, and the handler must open the backend feed after that cursor. A handler that ignores `maybeAfter` and starts later loses the entries in between.
- No entry is applied twice. A repeated entry has a `seq` at or below the cursor.
- An entry that arrives while the LiveQuery is paused is ignored. The feed requests it again after `requestResume`.

An entry whose `seq` is more than one above the cursor is applied, because the backend is the authority on which entries exist. Each `AppliedEntry` carries `maybePreviousCursor`, so a parent that expects contiguous sequence numbers can compare it with `seq`.

### Feed Failures and Stream Ends

When a feed Stream fails, LiveQuery marks the feed `Failed` and keeps its retained data. Data that had loaded becomes `Stale`, with the previous state beside the error. A feed that fails before its first entry enters `Failure`. The failed feed leaves the Subscription dependencies, and the other streaming feeds restart after their cursors.

A failed feed stays failed until the parent calls `requestResume`. A retry starts after the cursor, and the feed is `Connecting` with its `Stale` data. When the restarted Stream delivers its first entry, the connection becomes `Live` and the data becomes `Success`. If the retry fails before an entry arrives, the data stays `Stale` with the new error.

A feed Stream that ends without failing marks the feed `Offline` and keeps its data. A feed that ends before its first entry returns to `Idle`. `requestResume` opens it again.

## Test a LiveQuery

### Feed Messages in a Story

`sessionMessages(model, args)` returns constructors for the Messages that the feed's current Stream session delivers: `receivedEntry`, `failedFeed`, and `endedFeed`. A test uses them to drive update without running the handler. Build them from the Model the Messages are delivered to. Messages built before a restart belong to the earlier session, and LiveQuery ignores them. The fields of these Messages are internal and may change; build them through `sessionMessages`.

::Snippet{name="liveQueryStory" label="Testing an ignored duplicate entry with a Story"}

The `Feeds` Subscription entry is public too. `Feeds.modelToDependencies(model)` shows which feeds stream and the cursor each one resumes after.

### Handler Execution

To run the canonical handler, provide its underlying Services to the LiveQuery's `EffectsLayer` and collect the Stream for a set of dependencies:

::Snippet{name="liveQueryHandlerTest" label="Running the feed handler with a test Service"}

## When to Use a Subscription Directly

A LiveQuery is useful when entries carry a cursor that a restart must resume from. A stream without a cursor does not need that machinery. A presence count replaces its previous value, and a restart can start from the current value. Write an ordinary Subscription for it:

::Snippet{name="liveQueryUseSubscription" label="A presence count without a cursor"}

The Subscription restarts when `isBoardVisible` changes, and each Message carries the latest count. Nothing needs to be deduplicated, and nothing needs to resume.

## API Reference

The [LiveQuery API reference](/api-reference/experimental-live-query) lists the exact LiveQuery, `define`, `Connection`, Block, accessor, and operation signatures.
