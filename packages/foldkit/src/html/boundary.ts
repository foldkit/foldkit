import type { DispatchSync } from './runtimeSingleton.js'

/** Wrapping descriptor stored per Submodel boundary. */
export type WrapDescriptor = Readonly<{
  toParentMessage: (message: unknown) => unknown
}>

/** Boundary id is a `|`-joined chain of Submodel ids. Empty string
 *  represents the root boundary. Two-level example:
 *  `"work-history|entry-abc123"`. User-supplied ids must not contain
 *  the separator character; {@link composeBoundary} throws when they
 *  do. */
export type BoundaryId = string

const BOUNDARY_SEPARATOR = '|'

export const ROOT_BOUNDARY: BoundaryId = ''

export const composeBoundary = (
  parent: BoundaryId,
  childId: string,
): BoundaryId => {
  if (childId.includes(BOUNDARY_SEPARATOR)) {
    throw new Error(
      `Foldkit: h.submodel id cannot contain the boundary separator ` +
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
 *  `seenThisRender` tracks boundaries registered during the current
 *  render for duplicate-id detection: two `h.submodel` calls inside the
 *  same parent boundary must use different `id`s. Values are the call
 *  site captured at register time, surfaced when a second register
 *  collides so both locations land in the throw message. The set is
 *  cleared at the start of each render via `beginRender`. It is NOT
 *  used for pruning. Pruning is driven by VNode destroy hooks instead,
 *  so wraps for boundaries whose vnodes survive (e.g. a
 *  `createKeyedLazy` cache hit) stay registered even though `h.submodel`
 *  wasn't called for them this render. */
export type BoundaryRegistry = {
  readonly wraps: Map<BoundaryId, WrapDescriptor>
  readonly boundaryDispatches: WeakMap<
    DispatchSync,
    Map<BoundaryId, DispatchSync>
  >
  readonly seenThisRender: Map<BoundaryId, string>
}

export const createBoundaryRegistry = (): BoundaryRegistry => ({
  wraps: new Map(),
  boundaryDispatches: new WeakMap(),
  seenThisRender: new Map(),
})

const captureCallSite = (): string => {
  const stack = new Error().stack ?? ''
  const lines = stack.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.length === 0 ||
      trimmed.startsWith('Error') ||
      trimmed.includes('captureCallSite') ||
      trimmed.includes('registerBoundaryWrap') ||
      trimmed.includes('at submodel')
    ) {
      continue
    }
    return trimmed
  }
  return '(call site unavailable)'
}

export const registerBoundaryWrap = (
  registry: BoundaryRegistry,
  boundaryId: BoundaryId,
  descriptor: WrapDescriptor,
): void => {
  const existingCallSite = registry.seenThisRender.get(boundaryId)
  if (existingCallSite !== undefined) {
    const ownId = boundaryId.includes(BOUNDARY_SEPARATOR)
      ? boundaryId.slice(boundaryId.lastIndexOf(BOUNDARY_SEPARATOR) + 1)
      : boundaryId
    const newCallSite = captureCallSite()
    throw new Error(
      `Foldkit: duplicate h.submodel id "${ownId}" at boundary "${boundaryId}".\n` +
        `  First registration: ${existingCallSite}\n` +
        `  Second registration: ${newCallSite}\n` +
        `Each h.submodel call inside the same parent boundary must use a unique \`id\`. ` +
        `The id is DOM-position identity, not model identity. If the same model is ` +
        `rendered in two locations (desktop + mobile, master + detail), each position ` +
        `needs its own id (e.g. "desktop-foo", "mobile-foo"). For lists, use a stable ` +
        `per-item identifier.`,
    )
  }
  // NOTE: compute the call site before writing either map. If
  // captureCallSite throws (e.g. hardened runtime without
  // Error.stack), neither map is mutated, so a later registration
  // with the same id throws the duplicate error correctly instead of
  // silently overwriting after a half-finished prior write.
  const callSite = captureCallSite()
  registry.wraps.set(boundaryId, descriptor)
  registry.seenThisRender.set(boundaryId, callSite)
}

/** Removes a boundary's wrap. Called by `h.submodel`'s destroy hook when
 *  the corresponding vnode leaves the DOM.
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
): void => {
  registry.wraps.delete(boundaryId)
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
  let wrapped = message
  const parts = splitBoundary(boundaryId)
  for (let depth = parts.length; depth > 0; depth--) {
    const ancestorBoundary = parts.slice(0, depth).join(BOUNDARY_SEPARATOR)
    const descriptor = registry.wraps.get(ancestorBoundary)
    if (descriptor === undefined) {
      throw new Error(
        `Foldkit: dispatchAcrossBoundary missing wrap for ancestor ` +
          `"${ancestorBoundary}" of boundary "${boundaryId}". This means a ` +
          `Submodel's wrap was deregistered between event scheduling and ` +
          `dispatch. Most likely cause: a slot callback (h.submodel ` +
          `\`viewInputs\` function value) was invoked from a deferred context ` +
          `(setTimeout, Promise.then, stored callback) after the parent ` +
          `Submodel unmounted. Slot callbacks must be invoked synchronously ` +
          `inside the render in which they were created.`,
      )
    }
    wrapped = descriptor.toParentMessage(wrapped)
  }
  outerDispatch(wrapped)
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

/** Called at the start of each top-level render. Clears the
 *  per-render duplicate-id tracking map so siblings inside the same
 *  parent boundary can be re-validated. Does NOT touch `wraps` or
 *  `boundaryDispatches`. Those persist across renders and are evicted
 *  by vnode destroy hooks instead. */
export const beginRender = (registry: BoundaryRegistry): void => {
  registry.seenThisRender.clear()
}
