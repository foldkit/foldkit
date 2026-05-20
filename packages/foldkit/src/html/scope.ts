import type { DispatchSync } from './runtimeSingleton.js'

/** Wrapping descriptor stored per Submodel boundary. Captured as data
 *  (constructor reference + primitive args) so memoization is preserved
 *  across renders: the registered descriptor changes only when the
 *  primitive args change, not on every parent render.
 *
 *  `emit` is an optional per-tag handler map that takes precedence over
 *  `wrapWith` for matching child message tags. It lets the parent declare
 *  high-level event reactions (analogous to the old `onSelected*`
 *  callback prop) without forcing it to pattern-match the child's full
 *  Message union inside its `GotChildMessage` handler. The emit handler
 *  for a matching tag REPLACES `wrapWith` at that boundary; its result
 *  becomes the message that continues up the scope chain. */
export type WrapDescriptor = Readonly<{
  wrapWith: (
    args: Readonly<Record<string, unknown> & { message: unknown }>,
  ) => unknown
  wrapArgs: Readonly<Record<string, unknown>>
  emit?: Readonly<Record<string, (message: any) => unknown>>
}>

/** Scope id is a `|`-joined chain of Submodel ids. Empty string represents
 *  the root scope. Two-level example: `"work-history|entry-abc123"`. */
export type ScopeId = string

const SCOPE_SEPARATOR = '|'

export const ROOT_SCOPE: ScopeId = ''

export const composeScope = (parent: ScopeId, childId: string): ScopeId =>
  parent === ROOT_SCOPE ? childId : `${parent}${SCOPE_SEPARATOR}${childId}`

const splitScope = (scopeId: ScopeId): ReadonlyArray<string> =>
  scopeId === ROOT_SCOPE ? [] : scopeId.split(SCOPE_SEPARATOR)

const extractTag = (message: unknown): string | undefined => {
  if (typeof message !== 'object' || message === null) {
    return undefined
  }
  if (!('_tag' in message)) {
    return undefined
  }
  const tag = message._tag
  return typeof tag === 'string' ? tag : undefined
}

/** Per-runtime registry of Submodel wrapping descriptors. The runtime
 *  creates one of these in `start` and reuses it across renders.
 *  `h.submodel` writes into `wraps` each render and attaches a snabbdom
 *  `destroy` hook that calls `deregisterScopeWrap` when the corresponding
 *  vnode is removed from the DOM tree. The dispatch path reads from
 *  `wraps` at event-fire time.
 *
 *  `scopedDispatches` is a cache of per-scope dispatcher closures so
 *  `requireDispatch` returns a stable reference across renders (necessary
 *  for `createLazy`'s dispatch-identity check).
 *
 *  `seenThisRender` tracks scopes registered during the current render
 *  for duplicate-id detection: two `h.submodel` calls inside the same
 *  parent scope must use different `id`s. The set is cleared at the
 *  start of each render via `beginRender`. It is NOT used for pruning —
 *  pruning is driven by VNode destroy hooks instead, so wraps for
 *  scopes whose vnodes survive (e.g. h.list cache hits) stay registered
 *  even though `h.submodel` wasn't called for them this render. */
export type ScopeRegistry = {
  readonly wraps: Map<ScopeId, WrapDescriptor>
  readonly scopedDispatches: Map<ScopeId, DispatchSync>
  readonly seenThisRender: Set<ScopeId>
}

export const createScopeRegistry = (): ScopeRegistry => ({
  wraps: new Map(),
  scopedDispatches: new Map(),
  seenThisRender: new Set(),
})

export const registerScopeWrap = (
  registry: ScopeRegistry,
  scopeId: ScopeId,
  descriptor: WrapDescriptor,
): void => {
  if (registry.seenThisRender.has(scopeId)) {
    const ownId = scopeId.includes(SCOPE_SEPARATOR)
      ? scopeId.slice(scopeId.lastIndexOf(SCOPE_SEPARATOR) + 1)
      : scopeId
    throw new Error(
      `Foldkit: duplicate h.submodel id "${ownId}" at scope "${scopeId}". ` +
        `Each h.submodel call inside the same parent scope must use a ` +
        `unique \`id\`. For lists, use a stable per-item identifier (the ` +
        `same one you'd pass to h.list's getKey).`,
    )
  }
  registry.wraps.set(scopeId, descriptor)
  registry.seenThisRender.add(scopeId)
}

/** Removes a scope's wrap and cached dispatcher. Called by `h.submodel`'s
 *  destroy hook when the corresponding vnode leaves the DOM. */
export const deregisterScopeWrap = (
  registry: ScopeRegistry,
  scopeId: ScopeId,
): void => {
  registry.wraps.delete(scopeId)
  registry.scopedDispatches.delete(scopeId)
}

/** Applies the wrapping chain for `scopeId` from innermost to outermost,
 *  then dispatches the fully-wrapped message via `outerDispatch`. Called
 *  at event-fire time by the dispatcher closure returned from
 *  `getOrCreateScopedDispatch`. */
const dispatchScoped = (
  registry: ScopeRegistry,
  outerDispatch: DispatchSync,
  scopeId: ScopeId,
  message: unknown,
): void => {
  let wrapped = message
  const parts = splitScope(scopeId)
  for (let depth = parts.length; depth > 0; depth--) {
    const ancestorScope = parts.slice(0, depth).join(SCOPE_SEPARATOR)
    const descriptor = registry.wraps.get(ancestorScope)
    if (descriptor === undefined) {
      continue
    }
    const tag = extractTag(wrapped)
    const emitHandler = tag !== undefined ? descriptor.emit?.[tag] : undefined
    if (emitHandler !== undefined) {
      wrapped = emitHandler(wrapped)
    } else {
      wrapped = descriptor.wrapWith({
        ...descriptor.wrapArgs,
        message: wrapped,
      })
    }
  }
  outerDispatch(wrapped)
}

export const getOrCreateScopedDispatch = (
  registry: ScopeRegistry,
  outerDispatch: DispatchSync,
  scopeId: ScopeId,
): DispatchSync => {
  if (scopeId === ROOT_SCOPE) {
    return outerDispatch
  }
  const existing = registry.scopedDispatches.get(scopeId)
  if (existing !== undefined) {
    return existing
  }
  const dispatch: DispatchSync = message => {
    dispatchScoped(registry, outerDispatch, scopeId, message)
  }
  registry.scopedDispatches.set(scopeId, dispatch)
  return dispatch
}

/** Called at the start of each top-level render. Clears the
 *  per-render duplicate-id tracking set so siblings inside the same
 *  parent scope can be re-validated. Does NOT touch `wraps` or
 *  `scopedDispatches` — those persist across renders and are evicted by
 *  vnode destroy hooks instead. */
export const beginRender = (registry: ScopeRegistry): void => {
  registry.seenThisRender.clear()
}
