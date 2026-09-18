# Query

## Overview

`Query.define` is a remote-data Submodel. One Query owns one [AsyncData](/core/async-data) field. A KeyedQuery owns a `HashMap` of `{ args, data }` slots.

Fetch is an interruptible [Command](/core/commands). `informWatch` and `informForget` start and stop work from the Model. `watchSubscription` is one [Subscription](/core/subscriptions) entry. Parents fold child Messages with `query.lift`.

See [API Cache Query](/example-apps/api-cache-query) and [API Cache HttpApi](/example-apps/api-cache-http-api) for full apps.

## Define a Query

Pass `name`, `data`, `error`, and `execute`. The Model is the `AsyncData` codec for those schemas. `init` is `Idle`.

::Snippet{name="queryDefine" label="Query.define"}

Add `args` for a KeyedQuery. Omit `toKey` to JSON-encode args. Slot key and Interrupt identity share that function. Read a slot with `query.read(model, args)`.

::Snippet{name="queryKeyedDefine" label="KeyedQuery.define"}

`args` fields are `Schema.Codec`s with no encoding or decoding services.

## Lift into a parent

`query.lift` returns a child record. Bind it as `postsChild`. Declare the parent case with `query.ParentMessage`. Pass the constructor as `parentMessage`. Name both parent types so the handle is the full parent Message union.

A `Got*` handler calls `postsChild.fold(model)`. That fold takes `{ message: childMessage }`. Call `postsChild.fold(model, { message })` when you already have those fields. Policy Steps live on the same record, such as `postsChild.revalidateOrLoad(model)`.

A full `read` / `write` lens still infers the parent Model from `read`.

::Snippet{name="queryLift" label="query.lift"}

## Watch and forget

`informWatch` is the live key set. The Message payload is a `HashMap` of `toKey` to args. `informWatch` still takes an array of args. Missing keys `loadIfMissing`. Extra keys run the same forget path as `informForget`, including Interrupt of a pending Fetch.

A late `SettledFetch` does not restore a forgotten slot.

`watchSubscription` is one Subscription entry. `postsChild.watchSubscription(entry, modelToArgs)` reuses that lift's parent Message wrap.

::Snippet{name="queryWatch" label="watchSubscription"}

## Run outside of Foldkit

`Query.run` on a Query is an Effect that runs `execute` and returns settled `AsyncData`. KeyedQuery `run(args)` does the same for one slot. Neither writes a Model.

## HttpApi

`Query.HttpApi.Service.query` builds the same Submodel from an Effect `HttpApi` endpoint. An empty client request is a Query. Anything else is a KeyedQuery. Use `.query` for a request you are willing to run again.

::Snippet{name="queryHttpApi" label="Query.HttpApi.Service"}

Provide the service Layer through [Resources](/core/resources).

## Full API Surface

The [Query API reference](/api-reference/query) lists `define`, `lift`, `run`, `HttpApi.Service`, and the Query and KeyedQuery types.
