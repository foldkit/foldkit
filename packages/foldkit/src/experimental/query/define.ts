import { Predicate } from 'effect'

import {
  type KeyedQueryConfig,
  type LayeredKeyedQuery,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import { type LayeredQuery, type QueryConfig, defineQuery } from './query.js'

type DefineConfig =
  | (QueryConfig<string, unknown, unknown, unknown, unknown> & {
      readonly args?: never
      readonly toKey?: never
    })
  | KeyedQueryConfig<string, unknown, unknown, unknown, unknown, SyncFields>

const isKeyedQueryConfig = (
  config: DefineConfig,
): config is Extract<DefineConfig, { readonly args: SyncFields }> =>
  Predicate.hasProperty(config, 'args')

/**
 * Defines a Submodel that fetches data and retains it in the application
 * Model. Add `args` to define a {@link KeyedQuery}; omit them to define a
 * {@link Query}.
 *
 * The returned Query exposes `toLayer`, which accepts an Effect that constructs
 * its fetch handler. The constructor runs when the application Layer is built;
 * the returned fetch runs lazily for each Query operation. A KeyedQuery handler
 * receives the declared args, while a Query handler receives no arguments.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
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
  config: QueryConfig<Name, A, AI, E, EI> & {
    readonly args?: never
    readonly toKey?: never
  },
): LayeredQuery<Name, A, AI, E, EI>
export function define(config: DefineConfig): unknown {
  if (isKeyedQueryConfig(config)) {
    return defineKeyedQuery(config)
  }

  return defineQuery(config)
}
