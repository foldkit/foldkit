import { Effect, Predicate, type Schema } from 'effect'

import {
  type KeyedQueryClass,
  type KeyedQueryConfig,
  type KeyedQueryWithLive,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import {
  type QueryClass,
  type QueryConfig,
  type QueryWithLive,
  defineQuery,
} from './query.js'

type AnyGenerator = () => Generator<
  Effect.Effect<unknown, unknown, unknown>,
  (...args: ReadonlyArray<never>) => Effect.Effect<unknown, unknown, unknown>,
  unknown
>

type AnyConfig = Readonly<{
  args?: SyncFields
  handler?: AnyGenerator
}>

const isKeyedConfig = (
  config: AnyConfig,
): config is AnyConfig & Readonly<{ args: SyncFields }> =>
  Predicate.hasProperty(config, 'args')

/**
 * Defines a Query Block class that fetches data and retains it in the
 * application Model. Add `args` to define a {@link KeyedQueryClass}; omit them
 * to define a {@link QueryClass}.
 *
 * Set `handler` to a generator function that constructs the fetch function.
 * The returned class then carries its Layer as `Live`. The constructor runs
 * once when the Layer is built; the returned fetch runs for each Fetch
 * Command. A KeyedQuery fetch receives the declared args, while an unkeyed
 * fetch receives no arguments. Tests can provide different services to the
 * same Layer to exercise the application's fetch logic.
 *
 * Omit `handler` when a host supplies the implementation, and build the
 * Layer with `toLayer`, which accepts an Effect that constructs the fetch
 * function. `toLayer` can also build an alternative to an attached handler.
 *
 * Put the class in the parent Model Schema, create the instance with
 * `yield* new PostsQuery('posts', {})`, provide its Layer to the parent's
 * Layer, and send its `Requested*` Messages from parent update handlers.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  const Fields extends SyncFields,
  HandlerRequirements = never,
  Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
    never,
    never,
    never
  >,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify> &
    Readonly<{
      /** Constructs the fetch function when the Query Layer is built. */
      handler: () => Generator<
        Yielded,
        (
          args: Schema.Struct.Type<NoInfer<Fields>>,
        ) => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
        unknown
      >
    }>,
): KeyedQueryWithLive<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  Notify,
  Effect.Error<Yielded>,
  HandlerRequirements | Effect.Services<Yielded>
>
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements = never,
  Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
    never,
    never,
    never
  >,
  const Notify extends boolean = false,
>(
  config: QueryConfig<Name, A, AI, E, EI, Notify> &
    Readonly<{
      args?: never
      toKey?: never
      /** Constructs the fetch function when the Query Layer is built. */
      handler: () => Generator<
        Yielded,
        () => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
        unknown
      >
    }>,
): QueryWithLive<
  Name,
  A,
  AI,
  E,
  EI,
  Notify,
  Effect.Error<Yielded>,
  HandlerRequirements | Effect.Services<Yielded>
>
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  const Fields extends SyncFields,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify> &
    Readonly<{ handler?: never }>,
): KeyedQueryClass<Name, A, AI, E, EI, Fields, Notify>
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  const Notify extends boolean = false,
>(
  config: QueryConfig<Name, A, AI, E, EI, Notify> &
    Readonly<{
      args?: never
      toKey?: never
      handler?: never
    }>,
): QueryClass<Name, A, AI, E, EI, Notify>
export function define(config: AnyConfig): unknown {
  const build =
    config.handler === undefined
      ? undefined
      : // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
        Effect.gen(config.handler)

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  if (isKeyedConfig(config)) {
    return defineKeyedQuery(config as never, build as never)
  } else {
    return defineQuery(config as never, build as never)
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}
