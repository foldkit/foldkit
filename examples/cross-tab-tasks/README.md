# Cross-Tab Tasks

A task list persisted locally with [LiveStore](https://livestore.dev) that stays reactive across browser tabs. Open the page in two tabs and edit in one. The other updates immediately.

## What it shows

The example keeps LiveStore behind Foldkit's Elm Architecture boundaries:

- **The Store is an application resource.** `resources.ts` creates the LiveStore web adapter and Store in a scoped Effect Layer. Foldkit builds that Layer once, shares the Store with every Command and Subscription, and releases it with the application runtime.
- **Changes are events.** `schema.ts` declares the SQLite table, versioned events, and the materializer for each event. Replaying the event log deterministically reconstructs the task table.
- **Writes go through Commands.** `AddItem`, `ToggleItem`, `DeleteItem`, and `ClearCompleted` commit events. They never mutate the Foldkit Model directly.
- **One Subscription is the reactive feed.** LiveStore's query Stream emits the initial rows and every later projection, including commits made in another tab. Each emission becomes `ReceivedItems`, so update remains the only place that changes the Model.
- **The Model owns the rendered projection.** LiveStore is the source of truth for persisted data. The Foldkit Model is the source of truth for what the view renders, including loading and write-failure states plus local input and filter state.

The web adapter stores its databases in OPFS and coordinates supported browsers through a SharedWorker. Browsers without SharedWorker support fall back to single-tab mode.

## Effect 4 release

The example pins one exact LiveStore snapshot cohort from its Effect 4 main line. All LiveStore packages stay on the same commit-derived version so their runtime protocols cannot drift. This can move to a numbered release after LiveStore publishes an Effect 4 cohort compatible with Foldkit's current Effect RC.

## Sync scope

This example configures no remote sync backend. It works offline and demonstrates LiveStore's event-sourced local Store plus same-browser cross-tab reactivity, but it does not sync between devices. A LiveStore sync backend can be added without changing the Foldkit architecture: remote events would reach the same reactive query Subscription and enter update as `ReceivedItems`.

## Run it

```bash
pnpm --filter cross-tab-tasks-example dev
```
