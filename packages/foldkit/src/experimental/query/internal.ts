import { Context, Effect, Layer, Option, Schema, type Scope } from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import {
  __CurrentRegistry,
  type __Registry,
  __registerKeyWhileRunning,
} from '../../command/interruptible/interruptible.js'

export type AsyncDataTransition = <A, E>(
  data: AsyncData.AsyncData<A, E>,
) => Option.Option<AsyncData.AsyncData<A, E>>

export type KeyedArgs<Fields extends Schema.Struct.Fields> = Schema.Schema.Type<
  Schema.Struct<Fields>
>

/** Identifies the service holding a Query's fetch function. */
export interface QueryFetcher<Name extends string> {
  readonly '~foldkit/QueryFetcher': Name
}

let fetcherCount = 0

/** @internal Creates the service that holds one Query's fetch function. */
export const makeFetcher = <Name extends string, Execute>(
  name: Name,
): Context.Service<QueryFetcher<Name>, Execute> => {
  fetcherCount += 1
  return Context.Service<QueryFetcher<Name>, Execute>(
    `foldkit/Query/${name}/Fetcher#${fetcherCount}`,
  )
}

/** @internal Builds a fetcher Layer from an Effect that constructs the fetch
 *  function. Service lookups inside a fetch use the invocation context over
 *  the construction context. */
export const makeFetcherLayer = <
  Name extends string,
  Input extends ReadonlyArray<unknown>,
  A,
  E,
  R,
  BuildE,
  BuildR,
>(
  Fetcher: Context.Service<
    QueryFetcher<Name>,
    (...input: Input) => Effect.Effect<A, E>
  >,
  build: Effect.Effect<
    (...input: Input) => Effect.Effect<A, E, R>,
    BuildE,
    BuildR
  >,
): Layer.Layer<QueryFetcher<Name>, BuildE, Exclude<R | BuildR, Scope.Scope>> =>
  Layer.effect(
    Fetcher,
    Effect.gen(function* () {
      const execute = yield* build
      const context = yield* Effect.context<R>()

      return (...input: Input) =>
        Effect.updateContext(execute(...input), invocationContext =>
          Context.merge(context, invocationContext),
        )
    }),
  )

/** @internal Runs a fetch while it holds an interrupt key in the instance's
 *  own registry, so a cancel reaches only that instance's work. */
export const runWhileHoldingKey = <A, E, R>(
  registry: __Registry,
  key: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  __registerKeyWhileRunning(key, effect).pipe(
    Effect.provideService(__CurrentRegistry, registry),
  )
