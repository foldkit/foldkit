import { Array, Option } from 'effect'

import type { OutlineEntry, PatchOutlineEntry } from '../html/boundary.js'
import type { VNode } from '../snabbdom/vnode.js'
import { OutlineRect } from './schema.js'

const resolveElement = (vnode: VNode): Option.Option<Element> => {
  const rawElm = vnode.elm
  if (rawElm instanceof Element) {
    return Option.some(rawElm)
  }
  if (rawElm instanceof Text) {
    const parent = rawElm.parentElement
    return parent === null ? Option.none() : Option.some(parent)
  }
  if (rawElm instanceof Node) {
    const rawChildren = vnode.children
    const children: ReadonlyArray<unknown> = Array.isArray(rawChildren)
      ? rawChildren
      : []
    for (const child of children) {
      if (typeof child !== 'object' || child === null) {
        continue
      }
      if (!('elm' in child)) {
        continue
      }
      const childElm = Reflect.get(child, 'elm')
      if (childElm instanceof Element) {
        return Option.some(childElm)
      }
    }
  }
  return Option.none()
}

const outlineRectFromElement = (
  id: string,
  label: string,
  elm: Element,
  maybeCause: Option.Option<string>,
): Option.Option<OutlineRect> => {
  const rect = elm.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return Option.none()
  }
  return Option.some(
    OutlineRect.make({
      id,
      label,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      cause: Option.getOrUndefined(maybeCause),
    }),
  )
}

export const collectOutlineRects = (
  entries: ReadonlyArray<OutlineEntry | PatchOutlineEntry>,
  maybeCause: Option.Option<string>,
  fallbackRoot: Element,
  runtimeId: string,
): ReadonlyArray<OutlineRect> => {
  const rects: Array<OutlineRect> = []
  for (const entry of entries) {
    const maybeElm = resolveElement(entry.vnode)
    if (Option.isNone(maybeElm) || !maybeElm.value.isConnected) {
      continue
    }
    const id = 'patchId' in entry ? entry.patchId : entry.boundaryId
    const maybeRect = outlineRectFromElement(
      id,
      entry.label,
      maybeElm.value,
      maybeCause,
    )
    if (Option.isSome(maybeRect)) {
      rects.push(maybeRect.value)
    }
  }
  if (Array.isArrayNonEmpty(rects)) {
    return rects
  }
  const rect = fallbackRoot.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return []
  }
  return [
    OutlineRect.make({
      id: `root:${runtimeId}`,
      label: 'root',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      cause: Option.getOrUndefined(maybeCause),
    }),
  ]
}
