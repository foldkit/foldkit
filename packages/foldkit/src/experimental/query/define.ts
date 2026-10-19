import { Predicate } from 'effect'

import {
  type KeyedQuery,
  type KeyedQueryConfig,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import { type Query, type QueryConfig, defineQuery } from './query.js'

type DefineConfig =
  | (QueryConfig<string, unknown, unknown, unknown, unknown, any> & {
      readonly args?: never
      readonly toKey?: never
    })
  | KeyedQueryConfig<
      string,
      unknown,
      unknown,
      unknown,
      unknown,
      SyncFields,
      any
    >

const isKeyedQueryConfig = (
  config: DefineConfig,
): config is KeyedQueryConfig<
  string,
  unknown,
  unknown,
  unknown,
  unknown,
  SyncFields,
  any
> => Predicate.hasProperty(config, 'args')

/**
 * Defines a Submodel that fetches data and retains it in the application
 * Model. Add `args` to define a {@link KeyedQuery}; omit them to define a
 * {@link Query}.
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
  R = never,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, R>,
): KeyedQuery<Name, A, AI, E, EI, Fields, R>
export function define<Name extends string, A, AI, E, EI, R = never>(
  config: QueryConfig<Name, A, AI, E, EI, R> & {
    readonly args?: never
    readonly toKey?: never
  },
): Query<Name, A, AI, E, EI, R>
export function define(config: DefineConfig): unknown {
  if (isKeyedQueryConfig(config)) {
    return defineKeyedQuery(config)
  }

  return defineQuery(config)
}
