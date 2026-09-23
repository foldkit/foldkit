/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { parsedAttributeName } from '../domReflection.js'
import { markDirty } from './dirtyFlag.js'
import type { Module } from './module.js'
import { type VNode, type VNodeData, VNodeDataMask } from './vnode.js'

export type Classes = Record<string, boolean>

type RawClassAttribute =
  | Readonly<{ _tag: 'Absent' }>
  | Readonly<{
      _tag: 'Present'
      value: string | number | boolean
    }>

const absentRawClassAttribute: RawClassAttribute = { _tag: 'Absent' }
const ASCII_WHITESPACE = /[\t\n\f\r ]+/

const rawClassAttributeFor = (
  vnode: VNode,
  namespace: string | null,
): RawClassAttribute => {
  const attrs = (vnode.data as VNodeData).attrs
  if (attrs === undefined) {
    return absentRawClassAttribute
  }

  let attribute: RawClassAttribute = absentRawClassAttribute
  for (const name of Object.keys(attrs)) {
    if (parsedAttributeName(namespace, name) === 'class') {
      attribute = { _tag: 'Present', value: attrs[name]! }
    }
  }
  return attribute
}

const rawClassAttributesAgree = (
  previous: RawClassAttribute,
  next: RawClassAttribute,
): boolean => {
  if (previous._tag === 'Absent') {
    return next._tag === 'Absent'
  }
  return next._tag === 'Present' && previous.value === next.value
}

const rawClassNamesFor = (attribute: RawClassAttribute): Set<string> => {
  const names = new Set<string>()
  if (attribute._tag === 'Absent' || typeof attribute.value === 'boolean') {
    return names
  }
  for (const name of String(attribute.value).split(ASCII_WHITESPACE)) {
    if (name !== '') {
      names.add(name)
    }
  }
  return names
}

function updateClass(oldVnode: VNode, vnode: VNode): void {
  let cur: any
  let name: string
  const elm: Element = vnode.elm as Element
  let oldClass = (oldVnode.data as VNodeData).class
  let klass = (vnode.data as VNodeData).class
  const oldAttrs = (oldVnode.data as VNodeData).attrs
  const attrs = (vnode.data as VNodeData).attrs

  if (!oldClass && !klass) return
  if (oldClass === klass && oldAttrs === attrs) return
  const previousRawClass = rawClassAttributeFor(oldVnode, elm.namespaceURI)
  const nextRawClass = rawClassAttributeFor(vnode, elm.namespaceURI)
  if (
    oldClass === klass &&
    rawClassAttributesAgree(previousRawClass, nextRawClass)
  ) {
    return
  }
  oldClass = oldClass || {}
  klass = klass || {}

  if (oldClass === klass) {
    for (name in klass) {
      if (klass[name] && !elm.classList.contains(name)) {
        elm.classList.add(name)
        markDirty()
      }
    }
    return
  }

  const nextRawClassNames = rawClassNamesFor(nextRawClass)
  for (name in oldClass) {
    if (
      oldClass[name] &&
      klass[name] !== true &&
      !nextRawClassNames.has(name)
    ) {
      elm.classList.remove(name)
      markDirty()
    }
  }
  for (name in klass) {
    cur = klass[name]
    if (cur && !elm.classList.contains(name)) {
      elm.classList.add(name)
      markDirty()
    } else if (cur !== oldClass[name] && !nextRawClassNames.has(name)) {
      elm.classList.remove(name)
      markDirty()
    }
  }
}

export const classModule: Module = {
  dataMask: VNodeDataMask.Class,
  create: updateClass,
  update: updateClass,
}
