import { Option, Predicate } from 'effect'

import type { BoundaryRegistry } from './html/boundary.js'
import { trackPatchOutline } from './html/boundary.js'
import { propsModule } from './propsModule.js'
import {
  type VNode,
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  h,
  init,
  styleModule,
  toVNode,
} from './snabbdom/index.js'

export type { VNode } from './snabbdom/index.js'
export { toVNode }

let currentPatchRegistry: BoundaryRegistry | undefined

export const __setPatchOutlineRegistry = (
  registry: BoundaryRegistry | undefined,
): void => {
  currentPatchRegistry = registry
}

export const __clearPatchOutlineRegistry = (): void => {
  currentPatchRegistry = undefined
}

// NOTE: module order is load-bearing for hydration. `attributesModule` must run
// before `propsModule`. When a controlled input is adopted, the seeded server
// `value` attribute is removed by the attrs module first, which resets
// `elm.value`; only then does the props module reassert the model value, its
// `elm[key] !== cur` guard now seeing a cleared value. In the reverse order the
// props write is skipped as a no-op and the later attribute removal blanks the
// input. The controlled-input hydration tests fail if this order is changed.
export const patch = init(
  [
    attributesModule,
    classModule,
    datasetModule,
    eventListenersModule,
    propsModule,
    styleModule,
  ],
  undefined,
  {
    onDirty: vnode => {
      if (currentPatchRegistry !== undefined) {
        trackPatchOutline(currentPatchRegistry, vnode)
      }
    },
  },
)

// NOTE: snabbdom records each element's live DOM node on `vnode.elm` by
// mutating the vnode object during patch, and assumes one vnode object per tree
// position. A vnode object placed in more than one position would share a single
// `.elm`, so removals and text updates land on the wrong DOM node.
// `dedupeSharedVNodes` clones any vnode reached a second time within a render,
// or arriving with an `.elm` already set from a prior render, so every position
// gets its own object. Allocation happens only where reuse is actually found; a
// tree of freshly constructed vnodes returns unchanged.
//
// `createLazy`/`createKeyedLazy` results are recorded in `memoizedVNodes` and
// kept opaque here, so snabbdom's same-vnode short-circuit on a cache hit
// survives and the cached subtree is not walked. Their own contents are deduped
// separately by `dedupeMemoizedResult`, which the lazy helpers run on the freshly
// built subtree on a cache miss. Both passes share one per-render `seen` set
// (carried on the boundary registry and cleared each render), so a const reused
// INSIDE a memoized view, or across memoized siblings, is cloned just like a
// const reused anywhere else. A cache hit rebuilds nothing and is left
// untouched: a const inside the cached subtree still carries the `.elm` snabbdom
// set last render, so reuse of it elsewhere this render is cloned by the
// prior-render `.elm` rule above rather than the per-render set.
export const memoizedVNodes = new WeakSet<VNode>()

const dedupeChildList = (
  children: ReadonlyArray<VNode | string>,
  seen: Set<object>,
): Array<VNode | string> | undefined => {
  let nextChildren: Array<VNode | string> | undefined
  for (let index = 0; index < children.length; index++) {
    const child = children[index]!
    const deduped = typeof child === 'string' ? child : visit(child, seen)
    if (deduped !== child) {
      if (nextChildren === undefined) {
        nextChildren = children.slice()
      }
      nextChildren[index] = deduped
    }
  }
  return nextChildren
}

const visit = (node: VNode, seen: Set<object>): VNode => {
  const isDuplicate = seen.has(node)
  if (!isDuplicate && memoizedVNodes.has(node)) {
    seen.add(node)
    return node
  }
  const base: VNode =
    isDuplicate || node.elm != null ? { ...node, elm: undefined } : node
  seen.add(node)
  if (base.children === undefined) {
    return base
  }
  const nextChildren = dedupeChildList(base.children, seen)
  if (nextChildren === undefined) {
    return base
  }
  if (base === node) {
    return { ...node, children: nextChildren }
  }
  base.children = nextChildren
  return base
}

/** Clones any reused vnode in the tree so snabbdom never sees one object at two
 *  positions. Memoized subtrees (createLazy/createKeyedLazy results) are left
 *  opaque so their same-vnode short-circuit survives. Pass a shared `seen` set
 *  to coordinate with `dedupeMemoizedResult` across a render; omit it for
 *  one-off use. */
export const dedupeSharedVNodes = (
  root: VNode,
  seen: Set<object> = new Set(),
): VNode => visit(root, seen)

/** Dedupes the freshly built subtree of a memoized view (a
 *  createLazy/createKeyedLazy result) so a const shared inside it, or across
 *  memoized siblings sharing `seen`, is cloned even though the top-level pass
 *  leaves memoized subtrees opaque. The result root itself is left untracked, so
 *  the top-level pass still exempts it by membership rather than treating it as
 *  a duplicate. */
export const dedupeMemoizedResult = (
  root: VNode,
  seen: Set<object> = new Set(),
): VNode => {
  if (root.children === undefined) {
    return root
  }
  const nextChildren = dedupeChildList(root.children, seen)
  return nextChildren === undefined ? root : { ...root, children: nextChildren }
}

// NOTE: a fresh boot builds the whole tree so snabbdom fires every insert hook,
// which is what runs Mounts. Patching `toVNode(container)` directly would let
// snabbdom reuse a container whose existing DOM happens to match the new tree (a
// fresh `run` over server-rendered DOM, or an HMR restore), leaving those hooks
// unfired and Mounts unattached. Patching against a comment placed where the
// container was is never `sameVnode` with an element, so `createElm` builds the
// tree fresh and replaces the container, exactly as a boot into an empty
// container does.
const patchFreshInto = (container: HTMLElement, nextVNode: VNode): VNode => {
  const parent = container.parentNode
  if (parent === null) {
    return patch(toVNode(container), nextVNode)
  }
  const placeholder = container.ownerDocument.createComment('')
  parent.replaceChild(placeholder, container)
  return patch(toVNode(placeholder), nextVNode)
}

export const __patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nextVNode: VNode | null,
  container: HTMLElement,
  seen?: Set<object>,
  registry?: BoundaryRegistry,
): VNode => {
  const dedupedVNode = Predicate.isNotNull(nextVNode)
    ? dedupeSharedVNodes(nextVNode, seen)
    : h('!')

  if (registry === undefined) {
    return Option.match(maybeCurrentVNode, {
      onNone: () => patchFreshInto(container, dedupedVNode),
      onSome: currentVNode => patch(currentVNode, dedupedVNode),
    })
  }
  currentPatchRegistry = registry
  try {
    return Option.match(maybeCurrentVNode, {
      onNone: () => patchFreshInto(container, dedupedVNode),
      onSome: currentVNode => patch(currentVNode, dedupedVNode),
    })
  } finally {
    currentPatchRegistry = undefined
  }
}
