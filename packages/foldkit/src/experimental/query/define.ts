import { Effect, Layer, Predicate, type Schema, type Scope } from 'effect'

import type { Handler } from '../../command/handler.js'
import {
  type KeyedQueryConfig,
  type LayeredKeyedQuery,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import { type LayeredQuery, type QueryConfig, defineQuery } from './query.js'

type UnkeyedDefinitionFields<
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
> = QueryConfig<string, A, AI, E, EI> & {
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
> = KeyedQueryConfig<string, A, AI, E, EI, Fields> & {
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
 * Defines a Submodel that fetches data and retains it in the application
 * Model. Add `args` to define a {@link KeyedQuery}; omit them to define a
 * {@link Query}.
 *
 * Set `handler` to a generator function that constructs the fetch function.
 * The Query's `layer` supplies that implementation when included in the
 * application Layer. The constructor runs during application startup; the
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
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields> &
    Readonly<{
      /** Constructs the canonical fetch handler when the Query Layer is built. */
      handler: () => Generator<
        Yielded,
        (
          args: Schema.Struct.Type<NoInfer<Fields>>,
        ) => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
        unknown
      >
    }>,
): LayeredKeyedQuery<Name, A, AI, E, EI, Fields> &
  Readonly<{
    layer: Layer.Layer<
      Handler<`Fetch${Name}`>,
      Effect.Error<Yielded>,
      Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
    >
  }>
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
>(
  config: QueryConfig<Name, A, AI, E, EI> &
    Readonly<{
      args?: never
      toKey?: never
      /** Constructs the canonical fetch handler when the Query Layer is built. */
      handler: () => Generator<
        Yielded,
        () => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
        unknown
      >
    }>,
): LayeredQuery<Name, A, AI, E, EI> &
  Readonly<{
    layer: Layer.Layer<
      Handler<`Fetch${Name}`>,
      Effect.Error<Yielded>,
      Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
    >
  }>
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields> &
    Readonly<{ handler?: never }>,
): LayeredKeyedQuery<Name, A, AI, E, EI, Fields>
export function define<Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI> &
    Readonly<{
      args?: never
      toKey?: never
      handler?: never
    }>,
): LayeredQuery<Name, A, AI, E, EI>
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
      return defineKeyedQuery(config, Effect.gen(config.handler))
    } else {
      return defineKeyedQuery(config)
    }
  } else {
    if (Predicate.isNotUndefined(config.handler)) {
      return defineQuery(config, Effect.gen(config.handler))
    } else {
      return defineQuery(config)
    }
  }
}
