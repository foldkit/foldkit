# Query

## Overview

`Query.define` is a remote-data Submodel. A Query Model stores one [AsyncData](/core/async-data) value. A KeyedQuery Model stores a `HashMap` of `{ args, data }` slots. Use `read` to access the data in either Model.

Fetch is a [Command](/core/commands). `loadIfMissing`, `revalidate`, and `revalidateOrLoad` apply a loading policy to the Model and start that Command when the policy produces a transition. A fetched result stays for the life of the owning Model. Parents fold child Messages with `query.lift`.

See [API Cache Query](/example-apps/api-cache-query) for a full app.

## Define a Query

Pass `name`, `data`, `error`, and `execute`. The Model wraps the `AsyncData` codec for those schemas. `init` starts with `Idle` data. Read it with `query.read(model)`.

::Snippet{name="queryDefine" label="Query.define"}

Add `args` for a KeyedQuery. Omit `toKey` to JSON-encode args. Read a slot with `query.read(model, args)`.

::Snippet{name="queryKeyedDefine" label="KeyedQuery.define"}

`args` fields are `Schema.Codec`s with no encoding or decoding services.

## Choose a loading policy

Each policy deduplicates an existing request: `Loading` and `Refreshing` return the Model unchanged and start no Command.

| Policy             | `Idle` or `Failure`    | `Success` or `Stale`                      |
| ------------------ | ---------------------- | ----------------------------------------- |
| `loadIfMissing`    | Start `Loading`        | Keep the current value                    |
| `revalidate`       | Keep the current value | Start `Refreshing` with the existing data |
| `revalidateOrLoad` | Start `Loading`        | Start `Refreshing` with the existing data |

Use `loadIfMissing` when revisiting loaded data should be a cache hit. Use `revalidate` for background work that applies only to loaded data. Use `revalidateOrLoad` when the same entry point must handle both a cold Model and an existing value, such as application initialization or a Retry button.

## Lift into a parent

`query.lift` returns the Query operations lifted into the parent Model and Message. Bind that value for the resource, such as `posts`. Pass `toParentMessage`, the same adapter `Update.foldChild` takes. A `Got*` handler calls `posts.fold(model, message)`. Policy Steps live on the same value, such as `posts.revalidateOrLoad(model)`.

`fold` is an `Update.Fold`. Data-first is `posts.fold(model, message)`. Data-last is `posts.fold(message)`, so it composes with `Update.combine`.

A full `read` / `write` lens still infers the parent Model from `read`.

::Snippet{name="queryLift" label="query.lift"}

## Run outside of Foldkit

`Query.run` on a Query is an Effect that runs `execute` and returns settled `AsyncData`. KeyedQuery `run(args)` does the same for one slot. Neither writes a Model.

## Full API Surface

The [Query API reference](/api-reference/query) lists `define`, `read`, `lift`, `run`, and the Query and KeyedQuery types.
