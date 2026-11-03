import { Effect, Predicate, type Schema } from 'effect'

import type { ValidateConstructionRequirements } from '../../block/scope.js'
import type { KeyedQueryConfig, SyncFields } from './keyedQueryContract.js'
import {
  type AttachedKeyedQuery,
  type HostKeyedQuery,
  makeHostKeyedQuery,
  makeKeyedQuery,
} from './keyedQueryFamily.js'
import type { QueryConfig } from './queryContract.js'
import {
  type AttachedQuery,
  type HostQuery,
  makeHostQuery,
  makeQuery,
} from './queryFamily.js'

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
 * Declares a passive Query Block contract and an optional Fetch handler recipe.
 * Add `args` for keyed storage; omit them for one retained response.
 *
 * Bind the descriptor before construction and provide `Query.layer` through an
 * ordinary Layer at the graph's construction boundary. The acquired Block
 * supplies init, update, inMessageUpdate and operations. Model accessors and local
 * Message and parent InMessage constructors remain available on the descriptor.
 *
 * A generator `handler` constructs the Fetch invocation when its handler Layer
 * builds. Service acquisition belongs in that constructor. Pure Stories and
 * Scenes acquire the graph without building handler Layers.
 *
 * Omit `handler` for a host implementation. Build its recipe with `toLayer`
 * and select it through `provideHandlers`. An attached handler can be replaced
 * through the same method; selection retains the new Layer's exact channels.
 *
 * @experimental Ships from `foldkit/experimental/query`.
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
): AttachedKeyedQuery<
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
): AttachedQuery<
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
): HostKeyedQuery<Name, A, AI, E, EI, Fields, Notify>
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
): HostQuery<Name, A, AI, E, EI, Notify>
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
    if (config.handler !== undefined) {
      return Reflect.apply(makeKeyedQuery, undefined, [
        config,
        Effect.gen(config.handler),
      ])
    } else {
      return makeHostKeyedQuery(config)
    }
  } else {
    if (config.handler !== undefined) {
      return Reflect.apply(makeQuery, undefined, [
        config,
        Effect.gen(config.handler),
      ])
    } else {
      return makeHostQuery(config)
    }
  }
}
