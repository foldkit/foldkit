import { Effect, Predicate, type Schema } from 'effect'

import type { ValidateConstructionRequirements } from '../../block/scope.js'
import {
  type CanonicalKeyedQuery,
  type KeyedQueryConfig,
  type LayeredKeyedQuery,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import { type LayeredQuery, type QueryConfig, defineQuery } from './query.js'
import type { CanonicalQuery } from './query.js'

type UnkeyedDefinitionFields<
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
> = QueryConfig<string, A, AI, E, EI, boolean> & {
  readonly args?: never
  readonly toKey?: never
  readonly handler?: () => Generator<
    Effect.Effect<unknown, ConstructorError, ConstructorRequirements>,
    () => Effect.Effect<A, E, HandlerRequirements>,
    unknown
  >
}

type KeyedDefinitionFields<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
> = KeyedQueryConfig<string, A, AI, E, EI, Fields, boolean> & {
  readonly handler?: () => Generator<
    Effect.Effect<unknown, ConstructorError, ConstructorRequirements>,
    (
      args: Schema.Struct.Type<Fields>,
    ) => Effect.Effect<A, E, HandlerRequirements>,
    unknown
  >
}

type DefinitionFields<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
> =
  | UnkeyedDefinitionFields<
      A,
      AI,
      E,
      EI,
      HandlerRequirements,
      ConstructorError,
      ConstructorRequirements
    >
  | KeyedDefinitionFields<
      A,
      AI,
      E,
      EI,
      Fields,
      HandlerRequirements,
      ConstructorError,
      ConstructorRequirements
    >

const isKeyedQueryConfig = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
>(
  config: DefinitionFields<
    A,
    AI,
    E,
    EI,
    Fields,
    HandlerRequirements,
    ConstructorError,
    ConstructorRequirements
  >,
): config is KeyedDefinitionFields<
  A,
  AI,
  E,
  EI,
  Fields,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements
> => Predicate.hasProperty(config, 'args')

/**
 * Defines a Block that fetches data and retains it in the application
 * Model. Add `args` to define a {@link KeyedQuery}; omit them to define a
 * {@link Query}.
 *
 * Set `handler` to a generator function that constructs the fetch function.
 * The Query Block includes that implementation in its Effects Layer. The
 * constructor runs during application startup; the
 * returned fetch runs for each Query operation. A KeyedQuery fetch receives
 * the declared args, while an unkeyed fetch receives no arguments. Tests can
 * provide different services to the same Layer to exercise the application's
 * fetch logic.
 *
 * Omit `handler` when a host supplies the implementation. `toLayer`
 * accepts an Effect constructor for a host implementation or an alternative to
 * the canonical handler. Providing a handler Layer is explicit in both cases.
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
      /** Constructs the canonical fetch handler when the Query Layer is built. */
      handler: (() => Generator<
        Yielded,
        (
          args: Schema.Struct.Type<NoInfer<Fields>>,
        ) => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
        unknown
      >) &
        ValidateConstructionRequirements<Effect.Services<Yielded>>
    }>,
): CanonicalKeyedQuery<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  HandlerRequirements,
  Effect.Error<Yielded>,
  Effect.Services<Yielded>,
  Notify
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
      /** Constructs the canonical fetch handler when the Query Layer is built. */
      handler: (() => Generator<
        Yielded,
        () => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
        unknown
      >) &
        ValidateConstructionRequirements<Effect.Services<Yielded>>
    }>,
): CanonicalQuery<
  Name,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  Effect.Error<Yielded>,
  Effect.Services<Yielded>,
  Notify
>
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify> &
    Readonly<{ handler?: never }>,
): LayeredKeyedQuery<Name, A, AI, E, EI, Fields, Notify>
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
): LayeredQuery<Name, A, AI, E, EI, Notify>
export function define<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
>(
  config: DefinitionFields<
    A,
    AI,
    E,
    EI,
    Fields,
    HandlerRequirements,
    ConstructorError,
    ConstructorRequirements
  >,
): unknown {
  if (isKeyedQueryConfig(config)) {
    if (Predicate.isNotUndefined(config.handler)) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return defineKeyedQuery(config, Effect.gen(config.handler) as never)
    } else {
      return defineKeyedQuery(config)
    }
  } else {
    if (Predicate.isNotUndefined(config.handler)) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return defineQuery(config, Effect.gen(config.handler) as never)
    } else {
      return defineQuery(config)
    }
  }
}
