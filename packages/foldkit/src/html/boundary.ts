/** Render state the runtime shares across renders of one program.
 *
 *  `dedupeSeen` is the per-render set of VNode objects already placed in the
 *  tree. The top-level dedupe pass and `createLazy`'s own dedupe share it so
 *  a const VNode reused across memoized results is cloned. It is cleared at
 *  the start of each render. */
export type BoundaryRegistry = {
  readonly dedupeSeen: Set<object>
}

export const createBoundaryRegistry = (): BoundaryRegistry => ({
  dedupeSeen: new Set(),
})

/** Called at the start of each top-level render. */
export const beginRender = (registry: BoundaryRegistry): void => {
  registry.dedupeSeen.clear()
}
