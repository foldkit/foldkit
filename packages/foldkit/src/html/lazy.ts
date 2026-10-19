import { Array, Data, Predicate, Result } from 'effect'

import { type VNode, dedupeMemoizedResult, memoizedVNodes } from '../vdom.js'
import {
  type BoundaryId,
  type TrackedBoundaryWrap,
  beginLazyTracking,
  endLazyTracking,
  registerBoundaryWrapTransactionRollback,
  restoreBoundaryWrapsForLazyHit,
} from './boundary.js'
import {
  type DispatchSync,
  type MountRenderOwner,
  requireBoundary,
  requireDispatch,
  requireMountDispatch,
  requireMountRenderOwner,
} from './runtimeSingleton.js'

/** Why a lazy call ran its view instead of reusing the cached result. */
export type LazyMissReason = Data.TaggedEnum<{
  NoCachedEntry: {}
  FunctionChanged: {}
  FrameChanged: {}
  ArgumentCountChanged: Readonly<{
    previousCount: number
    currentCount: number
  }>
  ArgumentsChanged: Readonly<{ indices: ReadonlyArray<number> }>
}>

/** @internal Constructors and matching for lazy cache miss reasons. */
export const LazyMissReason = Data.taggedEnum<LazyMissReason>()

/** The result of a lazy cache lookup. `slot` identifies the `createLazy` or
 *  `createKeyedLazy` instance. `key` is undefined for unkeyed calls, and
 *  `missReason` is undefined when the cached result is reused. */
export type LazyResolution = Readonly<{
  slot: object
  key: PropertyKey | undefined
  missReason: LazyMissReason | undefined
}>

let resolutionObserver: ((resolution: LazyResolution) => void) | undefined

/** @internal Reports lazy cache hits and misses while `run` executes.
 *  Restores the previous observer when `run` returns or throws. */
export const observeLazyResolutions = <A>(
  observer: (resolution: LazyResolution) => void,
  run: () => A,
): A => {
  const previousObserver = resolutionObserver
  resolutionObserver = observer

  try {
    return run()
  } finally {
    resolutionObserver = previousObserver
  }
}

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
  mountDispatch: DispatchSync
  mountRenderOwner: MountRenderOwner
  vnode: VNode | null
  // NOTE: boundary registrations captured during the wrapped function's run.
  // A cache hit restores evicted wraps and replays their ids into the
  // duplicate-slotId guard even though `h.submodel` did not run.
  trackedBoundaries: ReadonlyMap<BoundaryId, TrackedBoundaryWrap>
}>

const findMissReason = (
  previousEntry: CacheEntry | undefined,
  fn: Function,
  args: ReadonlyArray<unknown>,
  dispatch: DispatchSync,
  mountDispatch: DispatchSync,
  mountRenderOwner: MountRenderOwner,
): LazyMissReason => {
  if (previousEntry === undefined) {
    return LazyMissReason.NoCachedEntry()
  }

  if (previousEntry.fn !== fn) {
    return LazyMissReason.FunctionChanged()
  }

  if (
    previousEntry.dispatch !== dispatch ||
    previousEntry.mountDispatch !== mountDispatch ||
    previousEntry.mountRenderOwner !== mountRenderOwner
  ) {
    return LazyMissReason.FrameChanged()
  }

  if (previousEntry.args.length !== args.length) {
    return LazyMissReason.ArgumentCountChanged({
      previousCount: previousEntry.args.length,
      currentCount: args.length,
    })
  }

  const indices = Array.filterMap(
    Array.zip(previousEntry.args, args),
    ([previousArg, arg], index) =>
      previousArg === arg ? Result.failVoid : Result.succeed(index),
  )

  return LazyMissReason.ArgumentsChanged({ indices })
}

const resolveOrCache = <Args extends ReadonlyArray<unknown>>(
  slot: object,
  key: PropertyKey | undefined,
  previousEntry: CacheEntry | undefined,
  fn: (...args: Args) => VNode | null,
  args: Args,
  onCache: (entry: CacheEntry | undefined) => void,
): VNode | null => {
  const dispatch = requireDispatch()
  const mountDispatch = requireMountDispatch()
  const mountRenderOwner = requireMountRenderOwner()
  const { registry } = requireBoundary()
  // NOTE: dispatcher identities and Mount render ownership belong in the
  // cache key because the cached VNode closes over them. Current frame
  // construction makes the Mount dispatcher identity derivable from the
  // ordinary dispatcher's owner and boundary, so the second identity cannot
  // change a cache decision today. Keeping both roles explicit prevents a
  // future renderer that separates them from retaining stale handler or Mount
  // lifecycle closures. Custom renderers can also use one dispatcher for both
  // owners, so the owner remains a separate key member.
  const isHit =
    Predicate.isNotUndefined(previousEntry) &&
    previousEntry.fn === fn &&
    previousEntry.dispatch === dispatch &&
    previousEntry.mountDispatch === mountDispatch &&
    previousEntry.mountRenderOwner === mountRenderOwner &&
    argsEqual(previousEntry.args, args)

  if (resolutionObserver !== undefined) {
    resolutionObserver({
      slot,
      key,
      missReason: isHit
        ? undefined
        : findMissReason(
            previousEntry,
            fn,
            args,
            dispatch,
            mountDispatch,
            mountRenderOwner,
          ),
    })
  }

  if (isHit) {
    restoreBoundaryWrapsForLazyHit(registry, previousEntry.trackedBoundaries)
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
  onCache({
    fn,
    args,
    dispatch,
    mountDispatch,
    mountRenderOwner,
    vnode: deduped,
    trackedBoundaries,
  })
  registerBoundaryWrapTransactionRollback(registry, previousEntry, onCache)
  return deduped
}

/** Creates a memoization slot for a view function. On each render, if the
 *  function reference, dispatchers, Mount render owner, and all arguments are
 *  equal to the previous call, the cached VNode is returned without
 *  re-running the view function. Snabbdom's `patchVnode` short-circuits when
 *  it sees the same VNode reference, so both VNode construction and subtree
 *  diffing are skipped.
 *
 *  Dispatchers and Mount render ownership are part of the cache key because
 *  event handlers and Mounts in the cached VNode close over the frame active
 *  when the VNode was built. Returning a VNode built under a different frame
 *  would silently misroute events or retain the wrong Mount lifecycle owner.
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
  const slot = {}

  return <Args extends ReadonlyArray<unknown>>(
    fn: (...args: Args) => VNode | null,
    args: Args,
  ): VNode | null =>
    resolveOrCache(slot, undefined, cached, fn, args, entry => {
      cached = entry
    })
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
  const slot = {}

  return <Args extends ReadonlyArray<unknown>>(
    key: PropertyKey,
    fn: (...args: Args) => VNode | null,
    args: Args,
  ): VNode | null =>
    resolveOrCache(slot, key, cache.get(key), fn, args, entry => {
      if (entry === undefined) {
        cache.delete(key)
      } else {
        cache.set(key, entry)
      }
    })
}
