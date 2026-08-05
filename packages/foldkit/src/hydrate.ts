import { Option } from 'effect'

import type { VNode } from './snabbdom/index.js'
import { h, toVNode } from './snabbdom/index.js'
import { tagNameFromSelector } from './tagName.js'
import { dedupeSharedVNodes, patch } from './vdom.js'

// NOTE: hydration builds the "old" side of the first patch as a structural
// clone of the NEW vnode tree with `elm` pointers adopted from the server
// DOM. The clone copies `sel`, `key`, `identity`, and `data.is`, so
// `sameVnode` passes at every adopted position and `patchVnode` reuses the
// existing element; its `data` is otherwise empty, so every module update
// hook applies the new tree's attrs, props, classes, styles, and listeners
// onto the adopted element. This leaves the vendored differ untouched: the
// whole hydration pass is expressible against `patch`'s public contract.
//
// Where the DOM disagrees with the vnode tree, the walk clears the nearest
// parent's children and hands `patch` an empty child list, so the subtree is
// rebuilt through `createElm`, which is exactly the pre-hydration replace
// behavior scoped to the mismatching subtree. Trailing vnode children with
// no DOM counterpart are simply absent from the clone; `updateChildren`
// appends them.

type AdoptedElements = Set<Node>

const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE

const isComment = (node: Node): node is Comment =>
  node.nodeType === Node.COMMENT_NODE

const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

const hasOnlyTextContent = (element: Element): boolean => {
  const firstChild = element.firstChild
  return (
    firstChild === null ||
    (firstChild.nextSibling === null && isText(firstChild))
  )
}

const matchesTag = (element: Element, selector: string): boolean =>
  element.tagName.toLowerCase() === tagNameFromSelector(selector).toLowerCase()

const cloneOf = (vnode: VNode, elm: Node): VNode => {
  const clone: VNode = {
    sel: vnode.sel,
    data: vnode.data?.is === undefined ? {} : { is: vnode.data.is },
    children: undefined,
    elm,
    text: undefined,
    key: vnode.key,
  }
  if (vnode.identity !== undefined) {
    clone.identity = vnode.identity
  }
  return clone
}

const asVNode = (child: VNode | string): VNode =>
  typeof child === 'string'
    ? {
        sel: undefined,
        data: undefined,
        children: undefined,
        elm: undefined,
        text: child,
        key: undefined,
      }
    : child

const clearChildren = (element: Element): void => {
  element.textContent = ''
}

type TextAdoption = Readonly<{ adoptedNode: Text; nextDomChild: Node | null }>

const adoptText = (
  element: Element,
  domChild: Node | null,
  text: string,
): Option.Option<TextAdoption> => {
  if (domChild !== null && isText(domChild)) {
    const domText = domChild.data
    if (domText === text) {
      return Option.some({
        adoptedNode: domChild,
        nextDomChild: domChild.nextSibling,
      })
    }
    if (domText.startsWith(text)) {
      domChild.splitText(text.length)
      return Option.some({
        adoptedNode: domChild,
        nextDomChild: domChild.nextSibling,
      })
    }
    return Option.none()
  }
  if (text === '') {
    const emptyTextNode = element.ownerDocument.createTextNode('')
    element.insertBefore(emptyTextNode, domChild)
    return Option.some({ adoptedNode: emptyTextNode, nextDomChild: domChild })
  }
  return Option.none()
}

const adoptElement = (
  element: Element,
  vnode: VNode,
  adopted: AdoptedElements,
): VNode => {
  const clone = cloneOf(vnode, element)
  adopted.add(element)

  const isInnerHtmlOwned = vnode.data?.props?.['innerHTML'] !== undefined
  if (isInnerHtmlOwned) {
    clone.data = { ...clone.data, props: { innerHTML: element.innerHTML } }
    clone.children = []
    return clone
  }

  const vnodeChildren = vnode.children
  if (vnodeChildren === undefined) {
    // NOTE: only adopt the text shortcut when the element already holds a
    // single text node. `textContent` flattens across element children, so
    // copying it for an element that carries stray markup would compare equal
    // to the vnode text and leave that markup in place. Leaving `clone.text`
    // undefined makes `patchVnode` overwrite the element's content with the
    // vnode text instead, rebuilding the mismatching shape.
    if (vnode.text !== undefined && hasOnlyTextContent(element)) {
      clone.text = element.textContent ?? ''
    }
    return clone
  }

  const cloneChildren: Array<VNode> = []
  let domChild: Node | null = element.firstChild

  for (const rawChild of vnodeChildren) {
    const child = asVNode(rawChild)

    if (child.sel === undefined || child.sel === '') {
      const childText = child.text ?? ''
      const maybeAdoption = adoptText(element, domChild, childText)
      if (Option.isNone(maybeAdoption)) {
        if (domChild === null) {
          break
        }
        clearChildren(element)
        clone.children = []
        return clone
      }
      const adoption = maybeAdoption.value
      const textClone = cloneOf(child, adoption.adoptedNode)
      textClone.text = childText
      cloneChildren.push(textClone)
      domChild = adoption.nextDomChild
      continue
    }

    if (domChild === null) {
      break
    }

    if (child.sel === '!') {
      if (!isComment(domChild)) {
        clearChildren(element)
        clone.children = []
        return clone
      }
      const commentClone = cloneOf(child, domChild)
      commentClone.text = domChild.data
      cloneChildren.push(commentClone)
      domChild = domChild.nextSibling
      continue
    }

    if (!isElement(domChild) || !matchesTag(domChild, child.sel)) {
      clearChildren(element)
      clone.children = []
      return clone
    }
    cloneChildren.push(adoptElement(domChild, child, adopted))
    domChild = domChild.nextSibling
  }

  while (domChild !== null) {
    const nextDomChild: Node | null = domChild.nextSibling
    element.removeChild(domChild)
    domChild = nextDomChild
  }

  clone.children = cloneChildren
  return clone
}

const fireAdoptedInsertHooks = (
  vnode: VNode,
  adopted: AdoptedElements,
): void => {
  const children = vnode.children
  if (children !== undefined) {
    for (const child of children) {
      if (typeof child !== 'string') {
        fireAdoptedInsertHooks(child, adopted)
      }
    }
  }
  const insertHook = vnode.data?.hook?.insert
  if (
    insertHook !== undefined &&
    vnode.elm !== undefined &&
    adopted.has(vnode.elm)
  ) {
    insertHook(vnode)
  }
}

/** Hydrates a server-rendered root element against the first render's vnode
 *  tree. Matching DOM nodes are adopted in place, so pre-rendered content is
 *  never torn down on boot: module hooks attach listeners and re-assert
 *  attrs and props onto the existing elements, and `insert` hooks (Mounts)
 *  fire for adopted nodes in the same children-first order the differ uses
 *  for created ones. A mismatching subtree falls back to a rebuild through
 *  `createElm` at the nearest parent, and a root-level mismatch falls back
 *  to the pre-hydration replace boot. Returns the patched vnode to store as
 *  the runtime's current tree. */
export const __hydrateVNode = (
  hydrationRoot: Element,
  nextVNode: VNode | null,
  seen?: Set<object>,
): VNode => {
  const dedupedVNode =
    nextVNode !== null ? dedupeSharedVNodes(nextVNode, seen) : h('!')

  if (
    dedupedVNode.sel === undefined ||
    dedupedVNode.sel === '' ||
    dedupedVNode.sel === '!' ||
    !matchesTag(hydrationRoot, dedupedVNode.sel)
  ) {
    return patch(toVNode(hydrationRoot), dedupedVNode)
  }

  const adopted: AdoptedElements = new Set()
  const adoptedClone = adoptElement(hydrationRoot, dedupedVNode, adopted)
  const patchedVNode = patch(adoptedClone, dedupedVNode)
  fireAdoptedInsertHooks(patchedVNode, adopted)
  return patchedVNode
}
