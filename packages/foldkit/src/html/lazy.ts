import { Predicate } from 'effect'

import type { VNode } from '../vdom.js'
import {
  type BoundaryId,
  beginLazyTracking,
  endLazyTracking,
  markSeenForLazyHit,
} from './boundary.js'
import {
  type DispatchSync,
  requireBoundary,
  requireDispatch,
} from './runtimeSingleton.js'

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
  // NOTE: boundaryIds and their call sites captured during the wrapped
  // function's run. On a later cache hit the same entry is replayed via
  // `markSeenForLazyHit` so the duplicate-slotId guard sees memoized
  // siblings even when their `h.submodel` did not run this render.
  trackedBoundaries: ReadonlyMap<BoundaryId, string>
}>

const resolveOrCache = <Args extends ReadonlyArray<unknown>>(
  previousEntry: CacheEntry | undefined,
  fn: (...args: Args) => VNode | null,
  args: Args,
  onCache: (entry: CacheEntry) => void,
): VNode | null => {
  const dispatch = requireDispatch()
  const { registry } = requireBoundary()
  // NOTE: dispatch identity in the cache key matters for the DevTools
  // jumpTo path: a replay render installs `noOpDispatch`, and without
  // this check a subsequent live render could return a vnode whose
  // handlers still reference the noOp.
  if (
    Predicate.isNotUndefined(previousEntry) &&
    previousEntry.fn === fn &&
    previousEntry.dispatch === dispatch &&
    argsEqual(previousEntry.args, args)
  ) {
    markSeenForLazyHit(registry, previousEntry.trackedBoundaries)
    return previousEntry.vnode
  }

  const trackedBoundaries = beginLazyTracking(registry)
  let vnode: VNode | null
  try {
    vnode = fn(...args)
  } finally {
    endLazyTracking(registry)
  }
  onCache({ fn, args, dispatch, vnode, trackedBoundaries })
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
 *  VNode close over the dispatch active when the VNode was built. Returning
 *  a VNode built under a different dispatch would silently misroute every
 *  event from that subtree.
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
