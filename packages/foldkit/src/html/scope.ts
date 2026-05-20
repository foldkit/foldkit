import type { DispatchSync } from './runtimeSingleton.js'

/** Wrapping descriptor stored per Submodel boundary. Captured as data
 *  (constructor reference + primitive args) so memoization is preserved
 *  across renders: the registered descriptor changes only when the
 *  primitive args change, not on every parent render. */
export type WrapDescriptor = Readonly<{
  wrapWith: (
    args: Readonly<Record<string, unknown> & { message: unknown }>,
  ) => unknown
  wrapArgs: Readonly<Record<string, unknown>>
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

/** Per-runtime registry of Submodel wrapping descriptors. The runtime
 *  creates one of these in `start` and reuses it across renders. h.submodel
 *  writes into `wraps` each render; the dispatch path reads from it at
 *  event-fire time. `scopedDispatches` is a cache of the per-scope
 *  dispatcher closures so `requireDispatch` returns a stable reference
 *  across renders (necessary for `createLazy`'s dispatch-identity check). */
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
  registry.wraps.set(scopeId, descriptor)
  registry.seenThisRender.add(scopeId)
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
    if (descriptor !== undefined) {
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

/** Called at the start of each top-level render so the registry can track
 *  which scopes were re-registered this pass. */
export const beginRender = (registry: ScopeRegistry): void => {
  registry.seenThisRender.clear()
}

/** Removes wrapping entries for scopes that were not re-registered during
 *  the latest render. Prevents unbounded growth when Submodel instances
 *  unmount (e.g. an entry is removed from a list). */
export const pruneUnseenScopes = (registry: ScopeRegistry): void => {
  for (const scopeId of Array.from(registry.wraps.keys())) {
    if (!registry.seenThisRender.has(scopeId)) {
      registry.wraps.delete(scopeId)
      registry.scopedDispatches.delete(scopeId)
    }
  }
}
