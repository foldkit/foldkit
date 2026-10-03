# Query

:::Warning{label="Experimental"}
Query ships from `foldkit/experimental`. Its core fetch and cache model is usable today, but names, Model shape, and lifecycle APIs may change before the module moves into Foldkit's stable API.
:::

## Overview

`Query.define` creates a Submodel for fetched data. A Query retains one [AsyncData](/core/async-data) value. A KeyedQuery retains one entry for each argument key. Use `read` to access either kind without depending on its Model representation.

Fetch is a [Command](/core/commands). `loadIfMissing`, `revalidate`, and `revalidateOrLoad` apply a loading policy to the Model and start that Command when the policy produces a transition. A fetched result stays for the life of the owning Model. Parents fold child Messages with `query.lift`.

See [API Cache Query](/example-apps/api-cache-query) for a full app.

## Define a Query

Import the Query namespace from `foldkit/experimental`.

Pass `name`, `data`, `error`, and `execute`. `execute` is the Effect that fetches the value, and `name` gives its Command a name such as `FetchPosts`. The generated Model Schema contains the `AsyncData` codec for `data` and `error`. `init` starts in `Idle`; read the current value with `query.read(model)`.

::Snippet{name="queryDefine" label="Query.define"}

Add `args` for a KeyedQuery. Each distinct key retains a separate `AsyncData` entry. By default, Query JSON-encodes the complete arguments as the key. Supply `toKey` when only part of the arguments identifies the fetched resource. Read an entry with `query.read(model, args)`.

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

`query.lift` returns the Query operations lifted into the parent Model and Message. Bind that value for the resource, such as `posts`. When the Query Model is a direct field of the parent, pass that `parentField` with `toParentMessage`, the same Message adapter `Update.foldChild` takes. A `Got*` handler calls `posts.fold(model, message)`. Loading Steps live on the same value, such as `posts.revalidateOrLoad(model)`.

`fold` is an `Update.Fold`. Data-first is `posts.fold(model, message)`. Data-last is `posts.fold(message)`, so it composes with `Update.combine`.

Pass a full `read` / `write` lens instead when the Query Model is optional, nested, or otherwise needs custom access.

::Snippet{name="queryLift" label="query.lift"}

## Run outside of Foldkit

`Query.run` is an Effect that runs `execute` and returns settled `AsyncData`. KeyedQuery `run(args)` does the same for one entry. Neither writes a Model.

## Full API Surface

The [Query API reference](/api-reference/experimental-query) lists `define`, `read`, `lift`, `run`, and the Query and KeyedQuery types.
