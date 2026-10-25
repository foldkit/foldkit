---
'foldkit': minor
---

Add experimental `LiveQuery` at `foldkit/experimental/liveQuery`, also available as `LiveQuery` from `foldkit/experimental`. LiveQuery is a viewless Block that retains the latest state of keyed live feeds, such as a shared order board, a document synchronized over a WebSocket, or an event-sourced read model. Before, an application that showed a pushed feed wrote its own Subscription, entry Messages, cursor bookkeeping, and reconnect logic, and a restart could apply an entry twice or skip one.

Each feed entry carries a sequence number `seq`, the complete `state` after the change, and optional `meta`. LiveQuery applies an entry only when its `seq` is greater than the feed's cursor, so repeated entries change nothing and report nothing. Every applied entry produces an `AppliedEntry` OutMessage with the feed args, `seq`, `maybePreviousCursor`, and `meta`, which a parent can use to confirm optimistic intents.

```ts
import { LiveQuery } from 'foldkit/experimental'

const orderBoardQuery = LiveQuery.define({
  name: 'OrderBoard',
  state: OrderBoard,
  error: Schema.String,
  meta: BoardEntryMeta,
  args: { boardId: Schema.String },
  handler: function* () {
    const events = yield* BoardEvents

    return ({ boardId }, maybeAfter) => events.entries(boardId, maybeAfter)
  },
})
```

One Subscription streams every watched feed. Its dependencies change only when the set of feeds changes, so an applied entry never restarts the Stream. A restart resumes every feed after its cursor in a new generation, and LiveQuery ignores events from older generations. Because the feeds share one Stream, a watch, an unwatch, or a feed that fails or ends reconnects every other streaming feed after its cursor. Per feed, LiveQuery retains `AsyncData`, the cursor, and a `Connection` state of `Connecting`, `Live`, `Offline`, or `Failed`. A feed is `Live` once its Stream delivers an entry in the current session. When a feed Stream fails, data that had loaded becomes `Stale` and a feed with no data enters `Failure`. Both stay until `requestResume` retries the feed.

The parent controls the feeds with `requestWatch`, `requestUnwatch`, `requestPause`, and `requestResume`, and reads them with `read`, `readCursor`, and `readConnection`. Tests build the Messages of a feed's current Stream session with `sessionMessages`. `requestWatch` accepts an optional snapshot of the state and its cursor, so a server-rendered feed starts as `Success` and resumes after the snapshot cursor without a loading state.

Like Query, the `handler` generator is built into the LiveQuery's `EffectsLayer`. Services that the handler or its Stream require become requirements of the completed Block, and TypeScript rejects starting a Program that does not provide them. Omit `handler` and use `toLayer` with `provideHandlers` when a host supplies the feed implementation. LiveQuery does not depend on any particular backend.
