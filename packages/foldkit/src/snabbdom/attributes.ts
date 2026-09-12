/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { parsedAttributeName } from '../domReflection.js'
import { markDirty } from './dirtyFlag.js'
import type { Module } from './module.js'
import { type VNode, type VNodeData, VNodeDataMask } from './vnode.js'

export type Attrs = Record<string, string | number | boolean>

const xlinkNS = 'http://www.w3.org/1999/xlink'
const xmlnsNS = 'http://www.w3.org/2000/xmlns/'
const xmlNS = 'http://www.w3.org/XML/1998/namespace'
const htmlNS = 'http://www.w3.org/1999/xhtml'

const FOREIGN_ATTRIBUTE_NAMESPACES: Readonly<Record<string, string>> = {
  'xlink:actuate': xlinkNS,
  'xlink:arcrole': xlinkNS,
  'xlink:href': xlinkNS,
  'xlink:role': xlinkNS,
  'xlink:show': xlinkNS,
  'xlink:title': xlinkNS,
  'xlink:type': xlinkNS,
  'xml:base': xmlNS,
  'xml:lang': xmlNS,
  'xml:space': xmlNS,
  xmlns: xmlnsNS,
  'xmlns:xlink': xmlnsNS,
}

const namespaceFor = (
  elementNamespace: string | null,
  name: string,
): string | undefined => {
  if (elementNamespace === null || elementNamespace === htmlNS) {
    return undefined
  }
  return FOREIGN_ATTRIBUTE_NAMESPACES[name]
}

const normalizedAttributes = (
  attrs: Attrs,
  namespace: string | null,
): Map<string, string | number | boolean> => {
  const normalized = new Map<string, string | number | boolean>()
  for (const name of Object.keys(attrs)) {
    normalized.set(parsedAttributeName(namespace, name), attrs[name]!)
  }
  return normalized
}

const setAttribute = (
  element: Element,
  name: string,
  value: string | number | boolean,
): void => {
  const namespace = namespaceFor(element.namespaceURI, name)
  if (value === true) {
    if (namespace === undefined) {
      element.setAttribute(name, '')
    } else {
      element.setAttributeNS(namespace, name, '')
    }
  } else if (value === false) {
    if (namespace === undefined) {
      element.removeAttribute(name)
    } else {
      const separator = name.indexOf(':')
      const localName = separator === -1 ? name : name.slice(separator + 1)
      element.removeAttributeNS(namespace, localName)
    }
  } else if (namespace === undefined) {
    element.setAttribute(name, value as any)
  } else {
    element.setAttributeNS(namespace, name, value as any)
  }
}

function updateAttrs(oldVnode: VNode, vnode: VNode): void {
  const elm: Element = vnode.elm as Element
  let oldAttrs = (oldVnode.data as VNodeData).attrs
  let attrs = (vnode.data as VNodeData).attrs

  if (!oldAttrs && !attrs) return
  if (oldAttrs === attrs) return
  oldAttrs = oldAttrs || {}
  attrs = attrs || {}

  const normalizedOld = normalizedAttributes(oldAttrs, elm.namespaceURI)
  const normalizedNext = normalizedAttributes(attrs, elm.namespaceURI)

  // update modified attributes, add new attributes
  for (const [name, cur] of normalizedNext) {
    const old = normalizedOld.get(name)
    if (old !== cur) {
      setAttribute(elm, name, cur)
      markDirty()
    }
  }

  for (const name of normalizedOld.keys()) {
    if (!normalizedNext.has(name)) {
      setAttribute(elm, name, false)
      markDirty()
    }
  }
}

export const attributesModule: Module = {
  dataMask: VNodeDataMask.Attrs,
  create: updateAttrs,
  update: updateAttrs,
}
