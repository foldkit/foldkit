import { Predicate } from 'effect'

import {
  type KeyedQueryClass,
  type KeyedQueryConfig,
  type SyncFields,
  defineKeyedQuery,
} from './keyedQuery.js'
import { type QueryClass, type QueryConfig, defineQuery } from './query.js'

type AnyConfig = Readonly<{
  args?: SyncFields
}>

const isKeyedConfig = (
  config: AnyConfig,
): config is AnyConfig & Readonly<{ args: SyncFields }> =>
  Predicate.hasProperty(config, 'args')

/**
 * Declares a Query Block class that fetches data and retains it in the
 * application Model. Add `args` to declare a {@link KeyedQueryClass}; omit
 * them to declare a {@link QueryClass}.
 *
 * The class is a declaration only. Implement it with its `layer` static: pass
 * an Effect that yields the services the fetch function uses and returns the
 * fetch function. `layer` returns a Layer that provides the Query Block and its
 * fetcher, and requires only what that Effect requires. The Effect runs once
 * when the Layer is built; the fetch function runs for each Fetch Command. A
 * KeyedQuery fetch receives the declared args, while an unkeyed fetch receives
 * no arguments. Tests can provide different services to the same Layer to
 * exercise the application's fetch logic.
 *
 * Put the class in the parent Model Schema, create the instance with
 * `new PostsQuery('posts', {})` in the parent's Model, provide its Layer to the
 * parent's Layer, and send its `Requested*` Messages from parent update
 * handlers.
 *
 * @example
 * ```ts
 * const PostsQuery = Query.define({
 *   name: 'PostsQuery',
 *   data: Schema.Array(Post),
 *   error: PostsError,
 * })
 *
 * const PostsQueryLive = PostsQuery.toLayer(
 *   Effect.gen(function* () {
 *     const api = yield* PostsApi
 *     return () => api.list
 *   }),
 * )
 * ```
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
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify>,
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
    }>,
): QueryClass<Name, A, AI, E, EI, Notify>
export function define(config: AnyConfig): unknown {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  if (isKeyedConfig(config)) {
    return defineKeyedQuery(config as never)
  } else {
    return defineQuery(config as never)
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}
