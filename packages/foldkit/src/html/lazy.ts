import { Predicate } from 'effect'

import type { VNode } from '../vdom.js'
import { type DispatchSync, requireDispatch } from './runtimeSingleton.js'

const argsEqual = (
  previous: ReadonlyArray<unknown>,
  current: ReadonlyArray<unknown>,
): boolean =>
  previous.length === current.length &&
  previous.every((value, index) => value === current[index])

type CacheEntry = Readonly<{
  fn: Function
  args: ReadonlyArray<unknown>
  dispatch: DispatchSync
  vnode: VNode | null
}>

const resolveOrCache = <Args extends ReadonlyArray<unknown>>(
  previousEntry: CacheEntry | undefined,
  fn: (...args: Args) => VNode | null,
  args: Args,
  onCache: (entry: CacheEntry) => void,
): VNode | null => {
  const dispatch = requireDispatch()
  if (
    Predicate.isNotUndefined(previousEntry) &&
    previousEntry.fn === fn &&
    previousEntry.dispatch === dispatch &&
    argsEqual(previousEntry.args, args)
  ) {
    return previousEntry.vnode
  }

  const vnode = fn(...args)
  onCache({ fn, args, dispatch, vnode })
  return vnode
}

/** Creates a memoization slot for a view function. On each render, if the
 *  function reference, dispatch, and all arguments are referentially equal
 *  (`===`) to the previous call, the cached VNode is returned without
 *  re-running the view function. Snabbdom's `patchVnode` short-circuits when
 *  it sees the same VNode reference, so both VNode construction and subtree
 *  diffing are skipped.
 *
 *  Dispatch is part of the cache key because event handlers in the cached
 *  VNode close over the dispatch active when the VNode was built. The
 *  DevTools `jumpTo` path renders past models with `noOpDispatch`; if lazy
 *  ignored dispatch identity, the next live render could return the
 *  noOp-bound VNode and the UI would appear unresponsive after resume.
 *
 *  The cached VNode must be rendered at a single position in the tree.
 *  Snabbdom tracks the real DOM through each VNode's mutable `.elm` field
 *  and assumes one VNode per position. Rendering the same cached VNode at
 *  two positions causes patches to collide and can duplicate or misplace
 *  DOM nodes. If the same content needs to appear in multiple positions,
 *  create one slot per position. */
export const createLazy = (): (<Args extends ReadonlyArray<unknown>>(
  fn: (...args: Args) => VNode | null,
  args: Args,
) => VNode | null) => {
  let cached: CacheEntry | undefined

  return <Args extends ReadonlyArray<unknown>>(
    fn: (...args: Args) => VNode | null,
    args: Args,
  ): VNode | null =>
    resolveOrCache(cached, fn, args, entry => {
      cached = entry
    })
}

/** Creates a keyed memoization map for view functions rendered in a loop. Each
 *  key gets its own independent cache slot. On each render, only entries whose
 *  function reference, dispatch, or arguments have changed by reference are
 *  recomputed.
 *
 *  Like `createLazy`, each key's cached VNode must be rendered at a single
 *  position in the tree. If the same item needs to appear in multiple
 *  positions, create one keyed lazy per position. */
export const createKeyedLazy = (): (<Args extends ReadonlyArray<unknown>>(
  key: string,
  fn: (...args: Args) => VNode | null,
  args: Args,
) => VNode | null) => {
  const cache = new Map<string, CacheEntry>()

  return <Args extends ReadonlyArray<unknown>>(
    key: string,
    fn: (...args: Args) => VNode | null,
    args: Args,
  ): VNode | null =>
    resolveOrCache(cache.get(key), fn, args, entry => {
      cache.set(key, entry)
    })
}
