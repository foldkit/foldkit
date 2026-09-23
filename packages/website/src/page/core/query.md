# Query

## Overview

`Query.define` is a remote-data Submodel. One Query owns one [AsyncData](/core/async-data) field. A KeyedQuery owns a `HashMap` of `{ args, data }` slots.

Fetch is a [Command](/core/commands). `loadIfMissing`, `revalidate`, and `revalidateOrLoad` start that Command from the Model. A fetched result stays for the life of the owning Model. Parents fold child Messages with `query.lift`.

See [API Cache Query](/example-apps/api-cache-query) for a full app.

## Define a Query

Pass `name`, `data`, `error`, and `execute`. The Model is the `AsyncData` codec for those schemas. `init` is `Idle`.

::Snippet{name="queryDefine" label="Query.define"}

Add `args` for a KeyedQuery. Omit `toKey` to JSON-encode args. Read a slot with `query.read(model, args)`.

::Snippet{name="queryKeyedDefine" label="KeyedQuery.define"}

`args` fields are `Schema.Codec`s with no encoding or decoding services.

## Lift into a parent

`query.lift` returns a child record. Bind it as `postsChild`. Pass `toParentMessage`, the same adapter `Update.foldChild` takes. A `Got*` handler calls `postsChild.fold(model, message)`. Policy Steps live on the same record, such as `postsChild.revalidateOrLoad(model)`.

`fold` is an `Update.Fold`. Data-first is `postsChild.fold(model, message)`. Data-last is `postsChild.fold(message)`, so it composes with `Update.combine`.

A full `read` / `write` lens still infers the parent Model from `read`.

::Snippet{name="queryLift" label="query.lift"}

## Run outside of Foldkit

`Query.run` on a Query is an Effect that runs `execute` and returns settled `AsyncData`. KeyedQuery `run(args)` does the same for one slot. Neither writes a Model.

## Full API Surface

The [Query API reference](/api-reference/query) lists `define`, `lift`, `run`, and the Query and KeyedQuery types.
