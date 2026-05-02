import { Effect, Predicate } from 'effect'

import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import type { Html } from './index.js'

const argsEqual = (
  previous: ReadonlyArray<unknown>,
  current: ReadonlyArray<unknown>,
): boolean =>
  previous.length === current.length &&
  previous.every((value, index) => value === current[index])

type CacheEntry = Readonly<{
  fn: Function
  args: ReadonlyArray<unknown>
  dispatch: object
  vnode: VNode | null
}>

const resolveOrCache = <Args extends ReadonlyArray<unknown>>(
  previousEntry: CacheEntry | undefined,
  fn: (...args: Args) => Html,
  args: Args,
  onCache: (entry: CacheEntry) => void,
): Html =>
  Effect.gen(function* () {
    const dispatch = yield* Dispatch
    if (
      Predicate.isNotUndefined(previousEntry) &&
      previousEntry.fn === fn &&
      previousEntry.dispatch === dispatch &&
      argsEqual(previousEntry.args, args)
    ) {
      return previousEntry.vnode
    }

    const vnode = yield* fn(...args)
    onCache({ fn, args, dispatch, vnode })
    return vnode
  })

/** Creates a memoization slot for a view function. On each render, if the
 *  function reference, dispatch context, and all arguments are referentially
 *  equal (`===`) to the previous call, the cached VNode is returned without
 *  re-running the view function. Snabbdom's `patchVnode` short-circuits when
 *  it sees the same VNode reference, so both VNode construction and subtree
 *  diffing are skipped. */
export const createLazy = (): (<Args extends ReadonlyArray<unknown>>(
  fn: (...args: Args) => Html,
  args: Args,
) => Html) => {
  let cached: CacheEntry | undefined

  return <Args extends ReadonlyArray<unknown>>(
    fn: (...args: Args) => Html,
    args: Args,
  ): Html =>
    resolveOrCache(cached, fn, args, entry => {
      cached = entry
    })
}

/** Creates a keyed memoization map for view functions rendered in a loop. Each
 *  key gets its own independent cache slot. On each render, only entries whose
 *  function reference, dispatch context, or arguments have changed by reference
 *  are recomputed. */
export const createKeyedLazy = (): (<Args extends ReadonlyArray<unknown>>(
  key: string,
  fn: (...args: Args) => Html,
  args: Args,
) => Html) => {
  const cache = new Map<string, CacheEntry>()

  return <Args extends ReadonlyArray<unknown>>(
    key: string,
    fn: (...args: Args) => Html,
    args: Args,
  ): Html =>
    resolveOrCache(cache.get(key), fn, args, entry => {
      cache.set(key, entry)
    })
}
