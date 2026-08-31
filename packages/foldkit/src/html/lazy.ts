import { Predicate } from 'effect'

import { type VNode, dedupeMemoizedResult, memoizedVNodes } from '../vdom.js'
import {
  type BoundaryId,
  beginLazyTracking,
  endLazyTracking,
  markSeenForLazyHit,
  trackOutline,
} from './boundary.js'
import {
  type DispatchSync,
  requireBoundary,
  requireDispatch,
} from './runtimeSingleton.js'

const argsEqual = (
  previous: ReadonlyArray<unknown>,
  current: ReadonlyArray<unknown>,
): boolean => {
  if (previous.length !== current.length) {
    return false
  }
  for (let index = 0; index < previous.length; index++) {
    if (previous[index] !== current[index]) {
      return false
    }
  }
  return true
}

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

const lazyLabel = (fn: Function, maybeKey?: PropertyKey): string => {
  const name = fn.name || 'anonymous'
  return maybeKey === undefined ? name : `${name}:${String(maybeKey)}`
}

const resolveOrCache = <Args extends ReadonlyArray<unknown>>(
  previousEntry: CacheEntry | undefined,
  fn: (...args: Args) => VNode | null,
  args: Args,
  onCache: (entry: CacheEntry) => void,
  maybeKey?: PropertyKey,
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
  // NOTE: dedupe the freshly built subtree against the per-render seen set so a
  // const shared inside this view, or across memoized siblings, is cloned even
  // though dedupeSharedVNodes leaves memoized subtrees opaque. Record the result
  // in memoizedVNodes so that top-level pass keeps it opaque on a cache hit.
  const deduped = Predicate.isNotNull(vnode)
    ? dedupeMemoizedResult(vnode, registry.dedupeSeen)
    : null
  if (Predicate.isNotNull(deduped)) {
    memoizedVNodes.add(deduped)
  }
  onCache({ fn, args, dispatch, vnode: deduped, trackedBoundaries })
  if (Predicate.isNotNull(deduped)) {
    const lazyId = `lazy:${lazyLabel(fn, maybeKey)}`
    trackOutline(registry, lazyId, lazyId, deduped)
  }
  return deduped
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
    resolveOrCache(
      cached,
      fn,
      args,
      entry => {
        cached = entry
      },
      undefined,
    )
}

/** Creates a keyed memoization map for one view function rendered under many
 *  keys. Each key gets its own independent cache slot, compared exactly the way
 *  `createLazy` compares its single slot: on each render, only the keys whose
 *  function reference, dispatch, or arguments changed by reference are
 *  recomputed. For example: a list rendering one row view per item, a detail
 *  view rendering one entity per route, or one view function rendered at two
 *  call sites.
 *
 *  Key by the identifier that already gives the rendered thing its DOM
 *  identity. A row keyed `todo.id` through `h.keyed` memoizes under `todo.id`;
 *  a detail page keyed `post.slug` memoizes under `post.slug`. Reusing that one
 *  identifier keeps the memo and the DOM invalidating together.
 *
 *  Entries are never evicted, so keys are expected to be bounded, such as an
 *  entity registry, a route table, or a fixed set of call sites. A key drawn
 *  from something unbounded, such as a search query or a paged cursor, grows
 *  the map for the lifetime of the page. If that becomes the shape an app
 *  needs, the upgrade path is a variant that drops keys absent from the latest
 *  render pass, not a cap on this one.
 *
 *  Like `createLazy`, each key's cached VNode must be rendered at a single
 *  position in the tree. If the same content needs to appear in multiple
 *  positions, give each position its own key. */
export const createKeyedLazy = (): (<Args extends ReadonlyArray<unknown>>(
  key: PropertyKey,
  fn: (...args: Args) => VNode | null,
  args: Args,
) => VNode | null) => {
  const cache = new Map<PropertyKey, CacheEntry>()

  return <Args extends ReadonlyArray<unknown>>(
    key: PropertyKey,
    fn: (...args: Args) => VNode | null,
    args: Args,
  ): VNode | null =>
    resolveOrCache(
      cache.get(key),
      fn,
      args,
      entry => {
        cache.set(key, entry)
      },
      key,
    )
}
