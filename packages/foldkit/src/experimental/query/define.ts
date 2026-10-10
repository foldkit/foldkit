import { Effect, Layer, Predicate, type Schema, type Scope } from 'effect'

import type { Handler } from '../../command/handler.js'
import {
  type KeyedQueryConfig,
  type LayeredKeyedQuery,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import { type LayeredQuery, type QueryConfig, defineQuery } from './query.js'

type DefinitionFields =
  | (QueryConfig<string, unknown, unknown, unknown, unknown> & {
      readonly args?: never
      readonly toKey?: never
    })
  | KeyedQueryConfig<string, unknown, unknown, unknown, unknown, SyncFields>

const isKeyedQueryConfig = (
  config: DefinitionFields,
): config is Extract<DefinitionFields, { readonly args: SyncFields }> =>
  Predicate.hasProperty(config, 'args')

/**
 * Defines a Submodel that fetches data and retains it in the application
 * Model. Add `args` to define a {@link KeyedQuery}; omit them to define a
 * {@link Query}.
 *
 * Pass an Effect that constructs the fetch function as the final argument.
 * The Query's `layer` supplies that implementation when included in the
 * application Layer.
 * The constructor runs during application startup; the returned fetch runs for
 * each Query operation. A KeyedQuery fetch receives the declared args, while an
 * unkeyed fetch receives no arguments. Tests can provide different services to
 * the same Layer to exercise the application's fetch logic.
 *
 * Omit the constructor when a host supplies the implementation. `toLayer`
 * accepts an Effect constructor for a host implementation or an alternative to the
 * canonical handler. Providing a handler Layer is explicit in both cases.
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
  BuildError = never,
  BuildRequirements = never,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
  handler: Effect.Effect<
    (
      args: Schema.Struct.Type<NoInfer<Fields>>,
    ) => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
    BuildError,
    BuildRequirements
  >,
): LayeredKeyedQuery<Name, A, AI, E, EI, Fields> &
  Readonly<{
    layer: Layer.Layer<
      Handler<`Fetch${Name}`>,
      BuildError,
      Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
    >
  }>
export function define<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements = never,
  BuildError = never,
  BuildRequirements = never,
>(
  config: QueryConfig<Name, A, AI, E, EI> &
    Readonly<{
      args?: never
      toKey?: never
    }>,
  handler: Effect.Effect<
    () => Effect.Effect<NoInfer<A>, NoInfer<E>, HandlerRequirements>,
    BuildError,
    BuildRequirements
  >,
): LayeredQuery<Name, A, AI, E, EI> &
  Readonly<{
    layer: Layer.Layer<
      Handler<`Fetch${Name}`>,
      BuildError,
      Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
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
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
): LayeredKeyedQuery<Name, A, AI, E, EI, Fields>
export function define<Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI> &
    Readonly<{
      args?: never
      toKey?: never
    }>,
): LayeredQuery<Name, A, AI, E, EI>
export function define<BuildError = never, BuildRequirements = never>(
  config: DefinitionFields,
  handler?: Effect.Effect<any, BuildError, BuildRequirements>,
): unknown {
  if (isKeyedQueryConfig(config)) {
    if (handler) {
      return defineKeyedQuery(config, handler)
    } else {
      return defineKeyedQuery(config)
    }
  } else {
    if (handler) {
      return defineQuery(config, handler)
    } else {
      return defineQuery(config)
    }
  }
}
