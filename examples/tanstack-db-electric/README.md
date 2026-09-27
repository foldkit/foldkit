# TanStack DB + ElectricSQL

The same task list as the [LiveStore example](../livestore), with its data layer replaced by [TanStack DB](https://tanstack.com/db) and [ElectricSQL](https://electric-sql.com). Tasks persist in Postgres, survive reloads, and stay reactive across browser tabs.

## What it shows

The example keeps TanStack DB and ElectricSQL behind Foldkit's Elm Architecture boundaries:

- **The collection is an application resource.** `itemsCollection.ts` configures the Electric collection. `store.ts` acquires it in a scoped Effect Layer, exposes the operations the application needs, and releases it with the application runtime.
- **Writes go through Commands.** `AddItem`, `ToggleItem`, `DeleteItem`, and `ClearCompleted` make optimistic collection mutations and wait for those mutations to persist. The collection handlers send an explicit `ItemsMutation` to Postgres and wait for its transaction ID to return through Electric.
- **One Subscription is the reactive feed.** TanStack DB collection changes become `UpdatedItems`, so update remains the only place that changes the Model. Independent Electric shape streams make the same changes appear in other tabs.
- **The Model owns the rendered projection.** Postgres is the source of truth for persisted data. The Foldkit Model is the source of truth for what the view renders, including the task filter, draft text, and write-failure state.
- **The server boundary is explicit.** The Vite-side backend decodes the shared mutation Schema, commits it through Effect SQL, and returns either `Committed` with the Postgres transaction ID or `Unchanged`. Electric is exposed through a separate shape proxy that fixes the shape to the `items` table and forwards only protocol parameters.

The current Electric collection keeps its client state in memory rather than OPFS. Unlike the LiveStore example, this example needs the Postgres and Electric services while it runs and does not provide offline writes. Its user-visible task behavior, reload persistence, and cross-tab reactivity are otherwise the same.

## Run it

[Docker](https://docs.docker.com/get-docker/) must be running. Start the example with:

```bash
pnpm --filter tanstack-db-electric-example dev
```

The command starts Postgres and Electric through `docker-compose.yaml`, applies `server/migration.sql`, and starts Vite. Open the URL Vite prints, then open it in a second tab to see changes synchronize.

Stop the backend services without deleting the database:

```bash
pnpm --filter tanstack-db-electric-example backend:down
```

Delete the local database volume as well:

```bash
pnpm --filter tanstack-db-electric-example backend:clear
```

`DATABASE_URL` and `ELECTRIC_URL` can point the Vite-side backend at another Postgres and Electric deployment. Their local defaults match `docker-compose.yaml`.
