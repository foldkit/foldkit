# Cross-Tab Tasks

A task list that persists in IndexedDB and stays live across browser tabs on one device, with no server. Open the page in two tabs and edit in one. The other updates right away.

## What it shows

The pattern for integrating an external reactive, persistent store while keeping the Elm Architecture intact: unidirectional data flow, Messages as facts, the Model as the single source of truth for what the UI renders.

- **The store is a boot-time service.** The IndexedDB database is opened once as an Effect Layer and passed to `makeApplication` as `resources`, so every Command and Subscription shares one handle for the application's lifetime. The handle never lives in the Model.
- **Writes go through Commands.** `AddItem`, `ToggleItem`, `DeleteItem`, and `ClearCompleted` mutate the object store and then announce the change on a `BroadcastChannel`. They do not touch the Model directly.
- **One Subscription is the reactive feed.** A persistent `BroadcastChannel` listener hears every commit, from this tab and every other tab alike, and reports `NotifiedStoreChanged`. There is exactly one reader, `LoadItems`, and exactly one place that writes items into the Model, `ReceivedItems`. Boot, a local write, and a cross-tab write all funnel through the same reload.
- **The Model is a projection.** `items` is an `AsyncData<Items, string>`. IndexedDB is the source of truth for persisted data; the Model is the source of truth for what the view renders. `newItemText` and `filter` are local UI state that never touch the store, which keeps the split honest.

## What this is not

This is not local-first, and the distinction is worth being precise about. Local-first, in the technical sense, means every device holds a full primary replica, replicas accept writes while offline, and their divergent histories merge without a central authority. The load-bearing problem is conflict-free merge of concurrent writes across independent replicas.

This example never confronts that problem. All tabs point at one IndexedDB database, so there is a single replica and a single source of truth. `BroadcastChannel` is not a replication protocol; it is a same-origin, same-machine change notification. Nothing diverges, so nothing has to merge. There is no cross-device sync, no operation log, and no conflict resolution.

So what it actually is: a single-device, offline-capable app with cross-tab reactivity. What it teaches is the Foldkit integration shape that a real local-first store slots into, not local-first itself.

## Why IndexedDB by hand

[LiveStore](https://livestore.dev) is the natural fit for local-first in the Effect ecosystem: event-sourced, reactive, and syncable across devices. Its stable line is built on Effect 3, and Foldkit is on Effect 4, so the two cannot share one runtime today. LiveStore's snapshot channel has already moved to the Effect 4 beta, so once it cuts a stable release on Effect 4 it becomes a drop-in for the store layer here. The boot-service, writes-as-Commands, and reactive-Subscription shape stays the same, while the hand-rolled IndexedDB reads and the BroadcastChannel feed get replaced by LiveStore events, materializers, reactive queries, and a sync backend. That last piece is what turns this shape into actual local-first: replicas on different devices, and a merge story for concurrent edits. This example teaches the shape now, without the dependency coupling.

## Run it

```bash
pnpm --filter cross-tab-tasks-example dev
```
