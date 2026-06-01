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
// mutating the vnode object during patch. A vnode object placed in more than
// one tree position would share a single `.elm`, so removals and text updates
// land on the wrong DOM node. View code legitimately reuses vnode values, e.g.
// `const checkmark = h.span(...)` dropped into several slots, so before each
// patch we clone any vnode object reached a second time, giving every position
// its own object.
// Detection is keyed off a per-patch Set, so a vnode reused across renders (a
// memoized `createLazy` subtree, the identical object each render) is reached
// only once per patch and passes through untouched, leaving snabbdom's
// same-object subtree short-circuit intact. Allocation happens only along
// paths where a duplicate is actually found; a tree with no reuse returns
// unchanged.
export const dedupeSharedVNodes = (root: VNode): VNode => {
  const seen = new Set<object>()
  const visit = (node: VNode): VNode => {
    const base: VNode = seen.has(node) ? { ...node, elm: undefined } : node
    seen.add(base)
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
