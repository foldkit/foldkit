import {
  setOutlineRecordingEnabled,
  shouldRecordOutline,
} from '../outline/recording.js'
import type { VNode } from '../snabbdom/vnode.js'
import type { DispatchSync } from './runtimeSingleton.js'

/** Wrapping descriptor stored per Submodel boundary. */
export type WrapDescriptor = Readonly<{
  toParentMessage: (message: unknown) => unknown
}>

/** Boundary id is a `|`-joined chain of Submodel slot ids. Empty
 *  string represents the root boundary. Two-level example:
 *  `"work-history|entry-abc123"`. User-supplied slot ids must not
 *  contain the separator character; {@link composeBoundary} throws when
 *  they do. */
export type BoundaryId = string

const BOUNDARY_SEPARATOR = '|'

type BoundaryWrapRegistration = Readonly<{
  _tag: 'Registration'
  boundaryId: BoundaryId
  descriptor: WrapDescriptor
  mountOuterDispatch: DispatchSync
  previousDescriptor: WrapDescriptor | undefined
  previousMountDescriptor: WrapDescriptor | undefined
}>

type BoundaryWrapRollback = Readonly<{
  _tag: 'Rollback'
  rollback: () => void
}>

type BoundaryWrapTransactionEntry =
  | BoundaryWrapRegistration
  | BoundaryWrapRollback

type BoundaryWrapTransaction = Readonly<{
  parent: BoundaryWrapTransaction | undefined
  startIndex: number
}>

/** @internal Registration metadata retained by a lazy VNode cache entry. */
export type TrackedBoundaryWrap = Readonly<{
  callSite: string
  descriptor: WrapDescriptor
  mountOuterDispatch: DispatchSync
}>

export const ROOT_BOUNDARY: BoundaryId = ''

export const composeBoundary = (
  parent: BoundaryId,
  childId: string,
): BoundaryId => {
  if (childId.includes(BOUNDARY_SEPARATOR)) {
    throw new Error(
      `Foldkit: h.submodel slotId cannot contain the boundary separator ` +
        `"${BOUNDARY_SEPARATOR}". Got ${JSON.stringify(childId)}.`,
    )
  }
  return parent === ROOT_BOUNDARY
    ? childId
    : `${parent}${BOUNDARY_SEPARATOR}${childId}`
}

const splitBoundary = (boundaryId: BoundaryId): ReadonlyArray<string> =>
  boundaryId === ROOT_BOUNDARY ? [] : boundaryId.split(BOUNDARY_SEPARATOR)

/** Per-runtime registry of Submodel wrapping descriptors. The runtime
 *  creates one of these in `start` and reuses it across renders.
 *  `h.submodel` writes into `wraps` each render and attaches a snabbdom
 *  `destroy` hook that calls `deregisterBoundaryWrap` when the
 *  corresponding vnode is removed from the DOM tree. The dispatch path
 *  reads from `wraps` at event-fire time.
 *
 *  `boundaryDispatches` caches per-(outerDispatch, boundaryId) dispatcher
 *  closures so `requireDispatch` returns a stable reference across
 *  repeated calls with the same outerDispatch (necessary for
 *  `createLazy`'s dispatch-identity check). Keyed by outerDispatch as a
 *  WeakMap so DevTools jump-to renders with a different
 *  outerDispatch (typically a noOpDispatch that drops messages) get
 *  their own per-boundary cache. Without this two-level keying, a
 *  dispatcher created during a live render would still close over the
 *  live outerDispatch after a jump-to and silently mutate the live app.
 *
 *  `mountWraps` provides the corresponding ownership-aware path for Mount
 *  results. Unlike event handlers, a surviving live Mount can emit while a
 *  replay render's wraps occupy `wraps`. Its dispatcher therefore reads only
 *  the wraps registered by renders with the same root Mount dispatcher, while
 *  still seeing replacements from later live renders. `mountWrapOwners`
 *  records every owner that has occupied a boundary so its final destroy hook
 *  can clear entries whose earlier hooks were replaced by in-place patches.
 *
 *  `seenThisRender` tracks boundaries marked alive during the current
 *  render for duplicate-slotId detection: two `h.submodel` calls
 *  inside the same parent boundary must use different `slotId`s.
 *  Values are the call site captured at register time, surfaced when a
 *  second register collides so both locations land in the throw
 *  message. The map is cleared at the start of each render via
 *  `beginRender`. Boundaries behind a `createLazy`/`createKeyedLazy`
 *  cache hit are replayed into this map via
 *  {@link restoreBoundaryWrapsForLazyHit} so the duplicate-slotId guard
 *  catches collisions against memoized siblings, not just against siblings
 *  that re-ran this frame. It does not drive pruning; VNode destroy hooks
 *  remove a descriptor only when it is still the current entry, so an old
 *  root cannot delete a same-cycle remount.
 *
 *  `lazyTrackingStack` is a stack of maps used by `createLazy` and
 *  `createKeyedLazy` to capture which boundary registrations were marked alive
 *  during the wrapped function's first execution. On a later cache
 *  hit, the lazy helper replays the captured ids into
 *  `seenThisRender` so the duplicate-slotId guard sees them. Each
 *  active lazy invocation pushes its own map; `registerBoundaryWrap`
 *  and `restoreBoundaryWrapsForLazyHit` write to every map on the stack so an
 *  outer lazy correctly captures registrations contributed by inner lazies it
 *  wraps. The registration snapshot also lets a cache hit restore wrapping
 *  descriptors after its cached VNode was removed and later reinserted.
 *
 *  `boundaryWrapTransactionLog` and `activeBoundaryWrapTransaction` make a
 *  Submodel view's registration and lazy-cache writes transactional. If that
 *  view throws or returns `null`, every nested registration and cache entry it
 *  produced is restored because none of those VNodes will reach snabbdom and
 *  run its destroy hook. */
export type OutlineEntry = Readonly<{
  boundaryId: string
  label: string
  vnode: VNode
}>

export type PatchOutlineEntry = Readonly<{
  patchId: string
  label: string
  vnode: VNode
}>
export type BoundaryRegistry = {
  readonly wraps: Map<BoundaryId, WrapDescriptor>
  readonly boundaryDispatches: WeakMap<
    DispatchSync,
    Map<BoundaryId, DispatchSync>
  >
  readonly mountWraps: WeakMap<DispatchSync, Map<BoundaryId, WrapDescriptor>>
  readonly mountWrapOwners: Map<BoundaryId, Set<DispatchSync>>
  readonly seenThisRender: Map<BoundaryId, string>
  readonly lazyTrackingStack: Array<Map<BoundaryId, TrackedBoundaryWrap>>
  readonly boundaryWrapTransactionLog: Array<BoundaryWrapTransactionEntry>
  activeBoundaryWrapTransaction: BoundaryWrapTransaction | undefined
  // NOTE: per-render set of VNode objects already placed in the tree, shared
  // between the top-level dedupe pass and createLazy's own dedupe so a const
  // reused across memoized results is cloned. Cleared each render.
  readonly dedupeSeen: Set<object>
  readonly outlineBuffer: Array<OutlineEntry>
  readonly patchOutlineBuffer: Array<PatchOutlineEntry>
  /** Shallow field snapshot of the last model passed to each Submodel boundary.
   *  Compared by reference on the next render so outlines fire when child input
   *  changes, not when the parent re-renders with identical field refs. */
  readonly submodelModelSnapshots: Map<
    BoundaryId,
    Readonly<Record<string, unknown>>
  >
}

export const createBoundaryRegistry = (): BoundaryRegistry => ({
  wraps: new Map(),
  boundaryDispatches: new WeakMap(),
  mountWraps: new WeakMap(),
  mountWrapOwners: new Map(),
  seenThisRender: new Map(),
  lazyTrackingStack: [],
  boundaryWrapTransactionLog: [],
  activeBoundaryWrapTransaction: undefined,
  dedupeSeen: new Set(),
  outlineBuffer: [],
  patchOutlineBuffer: [],
  submodelModelSnapshots: new Map(),
})

const readModelFieldSnapshot = (
  model: unknown,
): Readonly<Record<string, unknown>> => {
  if (typeof model !== 'object' || model === null) {
    return {}
  }
  return Object.fromEntries(Object.entries(model))
}

/** Returns true when any field reference on the Submodel child model changed
 *  since the last render of this boundary. The first render stores a snapshot
 *  and returns false so init does not flash. */
export const submodelModelChanged = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
  model: unknown,
): boolean => {
  const next = readModelFieldSnapshot(model)
  const previous = registry.submodelModelSnapshots.get(boundaryId)
  registry.submodelModelSnapshots.set(boundaryId, next)
  if (previous === undefined) {
    return false
  }
  const nextKeys = Object.keys(next)
  if (Object.keys(previous).length !== nextKeys.length) {
    return true
  }
  for (const key of nextKeys) {
    if (previous[key] !== next[key]) {
      return true
    }
  }
  return false
}

const captureCallSite = (): string => {
  const stack = new Error().stack ?? ''
  const lines = stack.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const isLazyInternalFrame = /[/\\]html[/\\]lazy\.[cm]?[jt]s/.test(trimmed)
    if (
      trimmed.length === 0 ||
      trimmed.startsWith('Error') ||
      trimmed.includes('captureCallSite') ||
      trimmed.includes('assertBoundaryNotSeen') ||
      trimmed.includes('registerBoundaryWrap') ||
      trimmed.includes('restoreBoundaryWrapsForLazyHit') ||
      isLazyInternalFrame ||
      trimmed.includes('at submodel')
    ) {
      continue
    }
    return trimmed
  }
  return '(call site unavailable)'
}

const assertBoundaryNotSeen = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
): void => {
  const existingCallSite = registry.seenThisRender.get(boundaryId)
  if (existingCallSite !== undefined) {
    const ownSlotId = boundaryId.includes(BOUNDARY_SEPARATOR)
      ? boundaryId.slice(boundaryId.lastIndexOf(BOUNDARY_SEPARATOR) + 1)
      : boundaryId
    const newCallSite = captureCallSite()
    throw new Error(
      `Foldkit: duplicate h.submodel slotId "${ownSlotId}" at boundary "${boundaryId}".\n` +
        `  First registration: ${existingCallSite}\n` +
        `  Second registration: ${newCallSite}\n` +
        `Each h.submodel call inside the same parent boundary must use a unique \`slotId\`. ` +
        `The slotId is DOM-slot identity, not model identity. If the same model is ` +
        `rendered in two locations (desktop + mobile, master + detail), each slot ` +
        `needs its own id (e.g. "desktop-foo", "mobile-foo"). For lists, use a stable ` +
        `per-item identifier.`,
    )
  }
}

export const registerBoundaryWrap = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
  descriptor: WrapDescriptor,
  mountOuterDispatch: DispatchSync,
): void => {
  assertBoundaryNotSeen(registry, boundaryId)

  // NOTE: compute the call site before writing either map. If
  // captureCallSite throws (e.g. hardened runtime without
  // Error.stack), neither map is mutated, so a later registration
  // with the same slotId throws the duplicate error correctly instead
  // of silently overwriting after a half-finished prior write.
  const callSite = captureCallSite()
  writeBoundaryWrap(
    registry,
    boundaryId,
    descriptor,
    mountOuterDispatch,
    callSite,
  )
}

const writeBoundaryWrap = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
  descriptor: WrapDescriptor,
  mountOuterDispatch: DispatchSync,
  callSite: string,
): void => {
  const previousDescriptor = registry.wraps.get(boundaryId)
  const existingMountWraps = registry.mountWraps.get(mountOuterDispatch)
  const previousMountDescriptor = existingMountWraps?.get(boundaryId)
  if (registry.activeBoundaryWrapTransaction !== undefined) {
    registry.boundaryWrapTransactionLog.push({
      _tag: 'Registration',
      boundaryId,
      descriptor,
      mountOuterDispatch,
      previousDescriptor,
      previousMountDescriptor,
    })
  }
  registry.wraps.set(boundaryId, descriptor)
  let mountWraps = existingMountWraps
  if (mountWraps === undefined) {
    mountWraps = new Map()
    registry.mountWraps.set(mountOuterDispatch, mountWraps)
  }
  mountWraps.set(boundaryId, descriptor)
  let mountWrapOwners = registry.mountWrapOwners.get(boundaryId)
  if (mountWrapOwners === undefined) {
    mountWrapOwners = new Set()
    registry.mountWrapOwners.set(boundaryId, mountWrapOwners)
  }
  mountWrapOwners.add(mountOuterDispatch)
  registry.seenThisRender.set(boundaryId, callSite)
  for (const tracked of registry.lazyTrackingStack) {
    tracked.set(boundaryId, { callSite, descriptor, mountOuterDispatch })
  }
}

/** Starts capturing boundary registrations on a fresh set pushed onto
 *  `lazyTrackingStack`. Used by `createLazy`/`createKeyedLazy` around the
 *  wrapped view function. Must be paired with {@link endLazyTracking} on
 *  the same call stack so an exception inside the view does not leak the
 *  tracking frame to a later render. */
export const beginLazyTracking = (
  registry: BoundaryRegistry,
): Map<BoundaryId, TrackedBoundaryWrap> => {
  const tracked = new Map<BoundaryId, TrackedBoundaryWrap>()
  registry.lazyTrackingStack.push(tracked)
  return tracked
}

/** Pops the most recent tracking set. Throws when called on an empty
 *  stack to surface unmatched begin/end pairs immediately rather than
 *  silently corrupting later renders. */
export const endLazyTracking = (registry: BoundaryRegistry): void => {
  if (registry.lazyTrackingStack.length === 0) {
    throw new Error(
      'Foldkit: endLazyTracking called on an empty stack. This means a ' +
        '`beginLazyTracking` was not paired with `endLazyTracking` upstream.',
    )
  }
  registry.lazyTrackingStack.pop()
}

/** Restores boundary registrations captured during a previous lazy run and
 *  replays their ids into `seenThisRender` so the duplicate-slotId guard sees
 *  them. Also forwards them into active tracking maps so an outer lazy
 *  wrapping this cache hit captures the registrations in its own snapshot.
 *
 *  A registration that still occupies both lookup tables needs only its seen
 *  marker restored. A registration evicted when the cached VNode left the DOM
 *  is written back transactionally, so a surrounding Submodel render that
 *  later fails can still roll the cache hit back. */
export const restoreBoundaryWrapsForLazyHit = (
  registry: BoundaryRegistry,
  trackedBoundaries: ReadonlyMap<BoundaryId, TrackedBoundaryWrap>,
): void => {
  for (const [boundaryId, trackedBoundary] of trackedBoundaries) {
    const { callSite, descriptor, mountOuterDispatch } = trackedBoundary
    assertBoundaryNotSeen(registry, boundaryId)

    registry.seenThisRender.set(boundaryId, callSite)
    for (const outerTracked of registry.lazyTrackingStack) {
      if (!outerTracked.has(boundaryId)) {
        outerTracked.set(boundaryId, trackedBoundary)
      }
    }

    if (
      registry.wraps.get(boundaryId) === descriptor &&
      registry.mountWraps.get(mountOuterDispatch)?.get(boundaryId) ===
        descriptor
    ) {
      continue
    }
    writeBoundaryWrap(
      registry,
      boundaryId,
      descriptor,
      mountOuterDispatch,
      callSite,
    )
  }
}

/** Removes a boundary's wrap when it still matches the descriptor owned by the
 *  VNode being destroyed. A replacement registered earlier in the same patch
 *  is left intact. Called by `h.submodel`'s destroy hook when the corresponding
 *  VNode leaves the DOM.
 *
 *  Does not touch `boundaryDispatches`: it is a WeakMap keyed by
 *  outerDispatch, so per-outerDispatch inner Maps become unreachable and
 *  are GC'd when their outerDispatch is. Cached dispatcher closures that
 *  outlive a deregister become inert. `dispatchAcrossBoundary` throws
 *  when it cannot find an ancestor wrap, which surfaces a clear error
 *  rather than letting events from a destroyed boundary silently
 *  misroute. */
export const deregisterBoundaryWrap = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
  descriptor: WrapDescriptor,
  mountOuterDispatch: DispatchSync,
): void => {
  registry.submodelModelSnapshots.delete(boundaryId)
  if (registry.wraps.get(boundaryId) === descriptor) {
    registry.wraps.delete(boundaryId)
    const mountWrapOwners = registry.mountWrapOwners.get(boundaryId)
    if (mountWrapOwners !== undefined) {
      for (const owner of mountWrapOwners) {
        registry.mountWraps.get(owner)?.delete(boundaryId)
      }
      registry.mountWrapOwners.delete(boundaryId)
    }
    return
  }
  const mountWraps = registry.mountWraps.get(mountOuterDispatch)
  if (mountWraps?.get(boundaryId) === descriptor) {
    mountWraps.delete(boundaryId)
    const mountWrapOwners = registry.mountWrapOwners.get(boundaryId)
    mountWrapOwners?.delete(mountOuterDispatch)
    if (mountWrapOwners?.size === 0) {
      registry.mountWrapOwners.delete(boundaryId)
    }
  }
}

/** Restores the registry entries replaced by one boundary registration that
 *  did not produce a VNode. Used when a Submodel view throws or returns
 *  `null`, where no destroy hook will run and cleanup must undo only that
 *  render owner's write without evicting descriptors retained by the
 *  currently rendered tree. */
const rollbackBoundaryWrapRegistration = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
  descriptor: WrapDescriptor,
  mountOuterDispatch: DispatchSync,
  previousDescriptor: WrapDescriptor | undefined,
  previousMountDescriptor: WrapDescriptor | undefined,
): void => {
  if (registry.wraps.get(boundaryId) === descriptor) {
    if (previousDescriptor === undefined) {
      registry.wraps.delete(boundaryId)
    } else {
      registry.wraps.set(boundaryId, previousDescriptor)
    }
  }

  const mountWraps = registry.mountWraps.get(mountOuterDispatch)
  if (mountWraps?.get(boundaryId) !== descriptor) {
    return
  }
  if (previousMountDescriptor === undefined) {
    mountWraps.delete(boundaryId)
    const mountWrapOwners = registry.mountWrapOwners.get(boundaryId)
    mountWrapOwners?.delete(mountOuterDispatch)
    if (mountWrapOwners?.size === 0) {
      registry.mountWrapOwners.delete(boundaryId)
    }
  } else {
    mountWraps.set(boundaryId, previousMountDescriptor)
  }
}

/** Starts a nested boundary-registration transaction for one Submodel view. */
export const beginBoundaryWrapTransaction = (
  registry: BoundaryRegistry,
): BoundaryWrapTransaction => {
  const transaction = {
    parent: registry.activeBoundaryWrapTransaction,
    startIndex: registry.boundaryWrapTransactionLog.length,
  }
  registry.activeBoundaryWrapTransaction = transaction
  return transaction
}

/** Commits a Submodel view's boundary registrations. Nested registrations stay
 *  in the parent transaction until that parent also produces a VNode. */
export const commitBoundaryWrapTransaction = (
  registry: BoundaryRegistry,
  transaction: BoundaryWrapTransaction,
): void => {
  if (registry.activeBoundaryWrapTransaction !== transaction) {
    throw new Error('Foldkit: boundary wrap transactions must commit in order.')
  }
  registry.activeBoundaryWrapTransaction = transaction.parent
  if (transaction.parent === undefined) {
    registry.boundaryWrapTransactionLog.length = 0
  }
}

/** Registers an internal cache restoration with the active Submodel boundary
 *  transaction. Calls outside a Submodel view need no rollback and are ignored. */
export const registerBoundaryWrapTransactionRollback = <A>(
  registry: BoundaryRegistry,
  value: A,
  restore: (value: A) => void,
): void => {
  if (registry.activeBoundaryWrapTransaction !== undefined) {
    registry.boundaryWrapTransactionLog.push({
      _tag: 'Rollback',
      rollback: () => {
        restore(value)
      },
    })
  }
}

/** Restores every boundary registration performed since a Submodel view began,
 *  including registrations from nested Submodels whose VNodes never reached
 *  snabbdom. */
export const rollbackBoundaryWrapTransaction = (
  registry: BoundaryRegistry,
  transaction: BoundaryWrapTransaction,
): void => {
  if (registry.activeBoundaryWrapTransaction !== transaction) {
    throw new Error(
      'Foldkit: boundary wrap transactions must roll back in order.',
    )
  }
  const entries = registry.boundaryWrapTransactionLog.splice(
    transaction.startIndex,
  )
  entries.reverse()
  for (const entry of entries) {
    if (entry._tag === 'Registration') {
      rollbackBoundaryWrapRegistration(
        registry,
        entry.boundaryId,
        entry.descriptor,
        entry.mountOuterDispatch,
        entry.previousDescriptor,
        entry.previousMountDescriptor,
      )
    } else {
      entry.rollback()
    }
  }
  registry.activeBoundaryWrapTransaction = transaction.parent
}

// NOTE: reading `_tag` can itself throw, through a getter or a Proxy trap. This
// runs while reporting another failure, so an escape here would replace the
// error being described with an unrelated one.
const describeMessage = (message: unknown): string => {
  try {
    if (typeof message === 'object' && message !== null && '_tag' in message) {
      const tag = Reflect.get(message, '_tag')
      if (typeof tag === 'string') {
        return `\`${tag}\``
      }
    }
  } catch {
    return 'the Message'
  }
  return 'the Message'
}

/** Applies one boundary's `toParentMessage`, translating a rejection into an
 *  error that names the cause.
 *
 *  A wrapper Message is normally a Schema constructor, so handing it a Message
 *  outside the child's union throws a Schema error naming both shapes and
 *  nothing else. That error is accurate and nearly undiagnosable: it fires
 *  inside a DOM listener, the app keeps rendering, and reading it requires
 *  already knowing that a boundary sits between the handler and `update`. The
 *  overwhelmingly common cause is a shared view helper that built an app-level
 *  Message inside a Submodel's view, where the dispatcher is chosen by the
 *  current render frame rather than by the Message's type. */
const liftAcrossBoundary = (
  descriptor: WrapDescriptor,
  boundaryId: BoundaryId,
  message: unknown,
): unknown => {
  try {
    return descriptor.toParentMessage(message)
  } catch (cause) {
    throw new Error(
      `Foldkit: a Message dispatched from inside Submodel boundary ` +
        `"${boundaryId}" could not be lifted into its parent's Message type. ` +
        `Its \`toParentMessage\` rejected ${describeMessage(message)}, which ` +
        `means that Message is not part of the Submodel's own Message union. ` +
        `The usual cause is a shared view helper building an app-level Message ` +
        `inside a Submodel's view: a handler's dispatcher is chosen by where ` +
        `the element is built, not by the Message it carries, so the boundary ` +
        `tried to wrap a Message the Submodel does not own. Either move the ` +
        `Message into the Submodel's union, or have the parent supply the ` +
        `element through a \`viewInputs\` slot callback so it is built in the ` +
        `parent's boundary.`,
      { cause },
    )
  }
}

type BoundaryChainMode = 'Dispatch' | 'OnUnmount' | 'Scene' | 'Mount'

const missingBoundaryWrapError = (
  mode: BoundaryChainMode,
  ancestorBoundary: BoundaryId,
  boundaryId: BoundaryId,
): Error => {
  if (mode === 'Dispatch') {
    return new Error(
      `Foldkit: dispatchAcrossBoundary missing wrap for ancestor ` +
        `"${ancestorBoundary}" of boundary "${boundaryId}". The Submodel's ` +
        `wrap was absent from the registry at dispatch time. A known cause: ` +
        `a slot callback (an h.submodel \`viewInputs\` function value) was ` +
        `invoked from a deferred context (setTimeout, Promise.then, a ` +
        `stored callback) after the parent Submodel unmounted. Slot ` +
        `callbacks must be invoked synchronously inside the render that ` +
        `created them. It can also mean foldkit was loaded as more than ` +
        `one instance (a bundler split foldkit and @foldkit/ui), so the ` +
        `wrap was registered in one copy and read from another.`,
    )
  } else if (mode === 'OnUnmount') {
    return new Error(
      `Foldkit: resolveBoundaryDispatchThunk missing wrap for ancestor ` +
        `"${ancestorBoundary}" of boundary "${boundaryId}" while resolving an ` +
        `OnUnmount message. The Submodel's wrap was absent from the registry ` +
        `at resolve time, which should not happen during a live render.`,
    )
  } else if (mode === 'Scene') {
    return new Error(
      `Foldkit: boundaryMappers missing wrap for ancestor ` +
        `"${ancestorBoundary}" of boundary "${boundaryId}" while snapshotting ` +
        `an OnMount lift. The Submodel's wrap was absent from the registry ` +
        `during render, which should not happen for a live boundary.`,
    )
  } else {
    return new Error(
      `Foldkit: Mount dispatch missing wrap for ancestor ` +
        `"${ancestorBoundary}" of boundary "${boundaryId}". The ` +
        `Submodel's wrap was absent from the Mount's render owner.`,
    )
  }
}

const foldBoundaryChain = <Result>(
  wraps: ReadonlyMap<BoundaryId, WrapDescriptor>,
  boundaryId: BoundaryId,
  mode: BoundaryChainMode,
  initial: Result,
  fold: (
    result: Result,
    descriptor: WrapDescriptor,
    ancestorBoundary: BoundaryId,
  ) => Result,
): Result => {
  let result = initial
  const parts = splitBoundary(boundaryId)
  for (let depth = parts.length; depth > 0; depth--) {
    const ancestorBoundary = parts.slice(0, depth).join(BOUNDARY_SEPARATOR)
    const descriptor = wraps.get(ancestorBoundary)
    if (descriptor === undefined) {
      throw missingBoundaryWrapError(mode, ancestorBoundary, boundaryId)
    }
    result = fold(result, descriptor, ancestorBoundary)
  }
  return result
}

const liftBoundaryMessage = (
  message: unknown,
  descriptor: WrapDescriptor,
  ancestorBoundary: BoundaryId,
): unknown => liftAcrossBoundary(descriptor, ancestorBoundary, message)

const collectBoundaryMapper = (
  mappers: Array<(message: unknown) => unknown>,
  descriptor: WrapDescriptor,
): Array<(message: unknown) => unknown> => {
  mappers.push(descriptor.toParentMessage)
  return mappers
}

/** Applies the wrapping chain for `boundaryId` from innermost to
 *  outermost, then dispatches the fully-wrapped message via
 *  `outerDispatch`. Called at event-fire time by the dispatcher closure
 *  returned from `getOrCreateBoundaryDispatch`.
 *
 *  Throws when an ancestor wrap is missing from the registry. DOM events
 *  fire synchronously, so a sync handler against a live boundary always
 *  finds a complete chain. A missing wrap implies one of: (a) the wrap
 *  was deregistered between event scheduling and dispatch (e.g. a slot
 *  callback captured at one render is invoked from a deferred context
 *  after the Submodel unmounted), or (b) the registry is corrupt.
 *  Either way, silently skipping the ancestor and applying only outer
 *  wraps would produce a malformed Message that the outermost
 *  `Match.tagsExhaustive` would then crash on with no useful trace. */
const dispatchAcrossBoundary = (
  registry: BoundaryRegistry,
  outerDispatch: DispatchSync,
  boundaryId: BoundaryId,
  message: unknown,
): void => {
  const wrapped = foldBoundaryChain(
    registry.wraps,
    boundaryId,
    'Dispatch',
    message,
    liftBoundaryMessage,
  )
  outerDispatch(wrapped)
}

/** Resolves a message through `boundaryId`'s wrapping chain immediately,
 *  applying every `toParentMessage` from innermost to outermost against the
 *  wraps present right now, and returns a thunk that dispatches the fully
 *  wrapped message via `outerDispatch`. Unlike {@link getOrCreateBoundaryDispatch},
 *  which defers the chain lookup to fire time, this snapshots the chain at call
 *  time so the resulting thunk survives the boundary being deregistered.
 *
 *  Used by `OnUnmount`: its destroy hook fires during the patch that tears the
 *  boundary down, after the Submodel's own destroy hook has already removed the
 *  wrap, so a fire-time lookup would throw. Resolving eagerly while the chain is
 *  still live and dispatching the precomputed root message at destroy time
 *  avoids that race. Throws here (at resolve time, boundary alive) if a wrap is
 *  somehow already missing, surfacing a real corruption rather than misrouting. */
export const resolveBoundaryDispatchThunk = (
  registry: BoundaryRegistry,
  outerDispatch: DispatchSync,
  boundaryId: BoundaryId,
  message: unknown,
): (() => void) => {
  if (boundaryId === ROOT_BOUNDARY) {
    return () => outerDispatch(message)
  }
  const rootMessage = foldBoundaryChain(
    registry.wraps,
    boundaryId,
    'OnUnmount',
    message,
    liftBoundaryMessage,
  )
  return () => outerDispatch(rootMessage)
}

/** Collects the `toParentMessage` wrapping chain for `boundaryId`, innermost
 *  ancestor first, against the wraps present right now. Folding the returned
 *  functions left-to-right over a child message reproduces exactly what
 *  {@link dispatchAcrossBoundary} dispatches, without dispatching. Returns an
 *  empty array at the root boundary. Used by `OnMount` to snapshot a
 *  Submodel-embedded mount's lift eagerly so the Scene test harness can replay
 *  it when the mount is resolved. Throws when an ancestor wrap is missing
 *  (boundary alive at call time), matching {@link dispatchAcrossBoundary}. */
export const boundaryMappers = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
): ReadonlyArray<(message: unknown) => unknown> => {
  return foldBoundaryChain<Array<(message: unknown) => unknown>>(
    registry.wraps,
    boundaryId,
    'Scene',
    [],
    collectBoundaryMapper,
  )
}

export const getOrCreateBoundaryDispatch = (
  registry: BoundaryRegistry,
  outerDispatch: DispatchSync,
  boundaryId: BoundaryId,
): DispatchSync => {
  if (boundaryId === ROOT_BOUNDARY) {
    return outerDispatch
  }
  let perOuterDispatch = registry.boundaryDispatches.get(outerDispatch)
  if (perOuterDispatch === undefined) {
    perOuterDispatch = new Map()
    registry.boundaryDispatches.set(outerDispatch, perOuterDispatch)
  }
  const existing = perOuterDispatch.get(boundaryId)
  if (existing !== undefined) {
    return existing
  }
  const dispatch: DispatchSync = message => {
    dispatchAcrossBoundary(registry, outerDispatch, boundaryId, message)
  }
  perOuterDispatch.set(boundaryId, dispatch)
  return dispatch
}

/** Returns a dispatcher for a Mount acquired inside `boundaryId`.
 *  The root dispatcher identifies the render owner: live and replay renders
 *  therefore consult separate wrap tables. Within that owner, the dispatcher
 *  resolves the current wrapping chain at emission time so a surviving Mount
 *  follows later live `toParentMessage` closures just like an event handler. */
export const resolveMountBoundaryDispatch = (
  registry: BoundaryRegistry,
  mountOuterDispatch: DispatchSync,
  boundaryId: BoundaryId,
): DispatchSync => {
  if (boundaryId === ROOT_BOUNDARY) {
    return mountOuterDispatch
  }
  const dispatch: DispatchSync = message => {
    const mountWraps = registry.mountWraps.get(mountOuterDispatch)
    if (mountWraps === undefined) {
      throw new Error(
        `Foldkit: Mount dispatch missing wraps for boundary "${boundaryId}". ` +
          `The Mount's render owner has no registered Submodel boundaries.`,
      )
    }
    const wrapped = foldBoundaryChain(
      mountWraps,
      boundaryId,
      'Mount',
      message,
      liftBoundaryMessage,
    )
    mountOuterDispatch(wrapped)
  }
  return dispatch
}

/** Called at the start of each top-level render. Clears the
 *  per-render duplicate-slotId tracking map so siblings inside the
 *  same parent boundary can be re-validated. Does not touch the wrap
 *  or dispatcher tables. Those persist across renders and are evicted
 *  by VNode destroy hooks instead. */
export { setOutlineRecordingEnabled, shouldRecordOutline }

export const trackOutline = (
  registry: BoundaryRegistry,
  boundaryId: string,
  label: string,
  vnode: VNode,
): void => {
  if (!shouldRecordOutline()) {
    return
  }
  registry.outlineBuffer.push({ boundaryId, label, vnode })
}

const collectVNodesInSubtree = (root: VNode): ReadonlySet<VNode> => {
  const seen = new Set<VNode>()
  const walk = (node: VNode | string): void => {
    if (typeof node === 'string') {
      return
    }
    seen.add(node)
    if (node.children === undefined) {
      return
    }
    for (const child of node.children) {
      walk(child)
    }
  }
  walk(root)
  return seen
}

/** True when a lazy or patch outline already targets a vnode strictly inside
 *  `root`. Used to skip the coarse Submodel boundary outline when finer
 *  tracking already captured the render work beneath it. */
export const hasNestedOutlineForSubtree = (
  registry: BoundaryRegistry,
  root: VNode,
): boolean => {
  const subtree = collectVNodesInSubtree(root)
  for (const entry of registry.outlineBuffer) {
    if (entry.vnode !== root && subtree.has(entry.vnode)) {
      return true
    }
  }
  for (const entry of registry.patchOutlineBuffer) {
    if (entry.vnode !== root && subtree.has(entry.vnode)) {
      return true
    }
  }
  return false
}

export const drainOutlines = (
  registry: BoundaryRegistry,
): ReadonlyArray<OutlineEntry> => {
  if (registry.outlineBuffer.length === 0) {
    return []
  }
  const entries = registry.outlineBuffer.slice()
  registry.outlineBuffer.length = 0
  return entries
}

export const trackPatchOutline = (
  registry: BoundaryRegistry,
  vnode: VNode,
): void => {
  if (!shouldRecordOutline()) {
    return
  }
  if (vnode.identity === undefined) {
    return
  }
  registry.patchOutlineBuffer.push({
    patchId: vnode.identity,
    label: vnode.identity,
    vnode,
  })
}

export const drainPatchOutlines = (
  registry: BoundaryRegistry,
): ReadonlyArray<PatchOutlineEntry> => {
  if (registry.patchOutlineBuffer.length === 0) {
    return []
  }
  const entries = registry.patchOutlineBuffer.slice()
  registry.patchOutlineBuffer.length = 0
  return entries
}

export const beginRender = (registry: BoundaryRegistry): void => {
  registry.seenThisRender.clear()
  registry.dedupeSeen.clear()
  registry.outlineBuffer.length = 0
  registry.patchOutlineBuffer.length = 0
}
