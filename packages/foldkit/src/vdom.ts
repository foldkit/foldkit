import {
  type VNode,
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'

import { propsModule } from './propsModule.js'

export type { VNode } from 'snabbdom'
export { toVNode }

export const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

// NOTE: snabbdom records each element's live DOM node on `vnode.elm` by
// mutating the vnode object during patch, and assumes one vnode object per
// tree position. A vnode object placed in more than one position would share a
// single `.elm`, so removals and text updates land on the wrong DOM node.
//
// Two ways a view reuses one object, both handled here so the reuse never
// reaches snabbdom:
//   1. The same object at two positions within a single render, e.g. a
//      `const checkmark = h.span(...)` dropped into several slots. Detected via
//      a per-patch Set: the second time an object is reached it is cloned.
//   2. The same object across renders, e.g. a module- or closure-level
//      `const icon = h.span(...)`. Such an object enters the next render still
//      carrying the `.elm` snabbdom set last time. While it stays at one
//      position this is harmless (snabbdom short-circuits on `oldVnode ===
//      newVnode`), but when its position shifts the stale `.elm` misdirects
//      snabbdom: moving toward an earlier sibling, the new slot is patched
//      before the old slot is removed, so the removal deletes the freshly
//      placed node and the element appears stuck on its previous row. Any
//      vnode arriving with `.elm` already set is therefore cloned with a
//      cleared `.elm`.
//
// `createLazy`/`createKeyedLazy` deliberately return the identical object each
// render and rely on snabbdom's same-vnode short-circuit, so their results are
// recorded in `memoizedVNodes` and pass through with identity intact, their
// subtree left unwalked. The exemption is keyed off membership alone, not off
// `.elm`: `h.submodel` re-wraps a memoized child view in a fresh boundary vnode
// each render (sharing the cached children array), and that wrapper carries no
// `.elm` of its own yet must stay opaque so its cached children are not cloned.
// `withBoundaryCleanup` propagates membership onto the wrapper for this reason.
// Allocation happens only along paths where reuse is actually found; a tree of
// freshly constructed vnodes returns unchanged.
export const memoizedVNodes = new WeakSet<VNode>()

export const dedupeSharedVNodes = (root: VNode): VNode => {
  const seen = new Set<object>()
  const visit = (node: VNode): VNode => {
    const isDuplicate = seen.has(node)
    if (!isDuplicate && memoizedVNodes.has(node)) {
      seen.add(node)
      return node
    }
    const base: VNode =
      isDuplicate || node.elm != null ? { ...node, elm: undefined } : node
    seen.add(node)
    const children = base.children
    if (children === undefined) {
      return base
    }
    let nextChildren: Array<VNode | string> | undefined
    for (let index = 0; index < children.length; index++) {
      const child = children[index]!
      const deduped = typeof child === 'string' ? child : visit(child)
      if (deduped !== child) {
        if (nextChildren === undefined) {
          nextChildren = children.slice()
        }
        nextChildren[index] = deduped
      }
    }
    if (nextChildren === undefined) {
      return base
    }
    if (base === node) {
      return { ...node, children: nextChildren }
    }
    base.children = nextChildren
    return base
  }
  return visit(root)
}
