import { Array, Data, Match, Predicate, Result } from 'effect'

import { type VNode, dedupeMemoizedResult, memoizedVNodes } from '../vdom.js'
import {
  type BoundaryId,
  type BoundaryRegistry,
  type KeyedLazyRenderState,
  type KeyedLazyUsages,
  type TrackedBoundaryWrap,
  beginBoundaryWrapTransaction,
  beginKeyedLazyTracking,
  beginLazyTracking,
  commitBoundaryWrapTransaction,
  endKeyedLazyTracking,
  endLazyTracking,
  registerBoundaryWrapTransactionRollback,
  restoreBoundaryWrapsForLazyHit,
  restoreKeyedLazyUsages,
  rollbackBoundaryWrapTransaction,
  trackKeyedLazyUsage,
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
  boundaryRegistry: BoundaryRegistry
  vnode: VNode | null
  // NOTE: boundary registrations captured during the wrapped function's run.
  // A cache hit restores evicted wraps and replays their ids into the
  // duplicate-slotId guard even though `h.submodel` did not run.
  trackedBoundaries: ReadonlyMap<BoundaryId, TrackedBoundaryWrap>
  trackedKeyedUsages: KeyedLazyUsages
}>

const findMissReason = (
  previousEntry: CacheEntry | undefined,
  fn: Function,
  args: ReadonlyArray<unknown>,
  dispatch: DispatchSync,
  mountDispatch: DispatchSync,
  mountRenderOwner: MountRenderOwner,
  registry: BoundaryRegistry,
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
    previousEntry.mountRenderOwner !== mountRenderOwner ||
    previousEntry.boundaryRegistry !== registry
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
    previousEntry.boundaryRegistry === registry &&
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
            registry,
          ),
    })
  }

  if (isHit) {
    restoreBoundaryWrapsForLazyHit(registry, previousEntry.trackedBoundaries)
    restoreKeyedLazyUsages(registry, previousEntry.trackedKeyedUsages)
    return previousEntry.vnode
  }

  const transaction = beginBoundaryWrapTransaction(registry)
  const trackedBoundaries = beginLazyTracking(registry)
  const trackedKeyedUsages = beginKeyedLazyTracking(registry)
  let vnode: VNode | null
  try {
    vnode = fn(...args)
  } catch (error) {
    rollbackBoundaryWrapTransaction(registry, transaction)
    throw error
  } finally {
    endKeyedLazyTracking(registry)
    endLazyTracking(registry)
  }

  if (vnode === null) {
    rollbackBoundaryWrapTransaction(registry, transaction)
    trackedBoundaries.clear()
    trackedKeyedUsages.clear()
  } else {
    commitBoundaryWrapTransaction(registry, transaction)
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
    boundaryRegistry: registry,
    vnode: deduped,
    trackedBoundaries,
    trackedKeyedUsages,
  })
  registerBoundaryWrapTransactionRollback(registry, previousEntry, onCache)
  return deduped
}

/** Creates a memoization slot for a view function. A cache hit returns the
 *  cached VNode without re-running the view. The function reference, runtime
 *  registry, dispatchers, Mount render owner, and every argument must equal
 *  the preceding call. Snabbdom's `patchVnode` short-circuits on the same VNode
 *  reference, skipping both construction and subtree diffing.
 *
 *  The runtime frame is part of the cache key because event handlers and
 *  Mounts close over the frame active when the VNode was built. Reusing a
 *  VNode from another frame would misroute events or retain the wrong Mount
 *  lifecycle owner.
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

/** Retention policy for a keyed view cache. `None` retains every key.
 *  `AbsentFromRender` releases entries unused by a completed render. */
export type KeyedLazyEviction = 'None' | 'AbsentFromRender'

/** Options for {@link createKeyedLazy}. `evict` defaults to `AbsentFromRender`. */
export type KeyedLazyConfig = Readonly<{
  evict?: KeyedLazyEviction
}>

type KeyedLazy = <Args extends ReadonlyArray<unknown>>(
  key: PropertyKey,
  fn: (...args: Args) => VNode | null,
  args: Args,
) => VNode | null

const writeCacheEntry = (
  cache: Map<PropertyKey, CacheEntry>,
  key: PropertyKey,
  entry: CacheEntry | undefined,
): void => {
  if (entry === undefined) {
    cache.delete(key)
  } else {
    cache.set(key, entry)
  }
}

const createRetainingKeyedLazy = (): KeyedLazy => {
  const cache = new Map<PropertyKey, CacheEntry>()
  const slot = {}

  return (key, fn, args) =>
    resolveOrCache(slot, key, cache.get(key), fn, args, entry => {
      writeCacheEntry(cache, key, entry)
    })
}

const createEvictingKeyedLazy = (): KeyedLazy => {
  const states = new WeakMap<
    BoundaryRegistry,
    Readonly<{
      cache: Map<PropertyKey, CacheEntry>
      renderState: KeyedLazyRenderState
    }>
  >()
  const slot = {}

  return (key, fn, args) => {
    const { registry } = requireBoundary()
    const existingState = states.get(registry)
    const cache = existingState?.cache ?? new Map<PropertyKey, CacheEntry>()
    const renderState = existingState?.renderState ?? {
      keys: () => cache.keys(),
      delete: (key: PropertyKey) => {
        cache.delete(key)
      },
      clear: () => {
        cache.clear()
      },
      isEmpty: () => cache.size === 0,
    }

    if (existingState === undefined) {
      states.set(registry, { cache, renderState })
    }

    const vnode = resolveOrCache(slot, key, cache.get(key), fn, args, entry => {
      writeCacheEntry(cache, key, entry)
    })
    trackKeyedLazyUsage(registry, renderState, key)
    return vnode
  }
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
 *  Each entry holds the cached VNode, and that VNode holds its DOM element on
 *  `.elm`. A key that stays in the map keeps that element alive.
 *
 *  By default, entries unused by a completed render are released. This bounds
 *  the keyed cache to entries used by the latest completed render, including
 *  entries beneath a cached parent. Cache writes roll back if view construction
 *  fails. Each runtime or server render has its own cache, so separate apps and
 *  requests cannot evict each other.
 *
 *  Pass `{ evict: 'None' }` to retain entries across renders where their keys
 *  are absent. Use explicit retention only with a bounded set, such as an
 *  entity registry, a route table, or fixed call sites. Every retained entry
 *  holds its VNode and DOM element after that element leaves the document.
 *
 *  Like `createLazy`, each key's cached VNode must be rendered at a single
 *  position in the tree. If the same content needs to appear in multiple
 *  positions, give each position its own key. */
export const createKeyedLazy = (
  config?: KeyedLazyConfig,
): (<Args extends ReadonlyArray<unknown>>(
  key: PropertyKey,
  fn: (...args: Args) => VNode | null,
  args: Args,
) => VNode | null) => {
  const eviction = config?.evict ?? 'AbsentFromRender'

  return Match.value(eviction).pipe(
    Match.when('None', () => createRetainingKeyedLazy()),
    Match.when('AbsentFromRender', () => createEvictingKeyedLazy()),
    Match.exhaustive,
  )
}
