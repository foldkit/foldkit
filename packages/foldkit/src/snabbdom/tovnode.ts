/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { addNS } from './h.js'
import { type DOMAPI, htmlDomApi } from './htmldomapi.js'
import { type VNode, vnode } from './vnode.js'

/**
 * Transforms the given attribute name into a valid dataset property key
 * according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset#name_conversion
 *
 * @param attributeName data- attribute name, must start with data-
 */
function datasetKey(attributeName: string): string {
  return attributeName
    .slice(5)
    .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())
}

export function toVNode(node: Node, domApi?: DOMAPI): VNode {
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi
  let text: string
  if (api.isElement(node)) {
    const id = node.id ? '#' + node.id : ''
    const cn = node.getAttribute('class')?.match(/[^\t\r\n\f ]+/g)
    const c = cn ? '.' + cn.join('.') : ''
    const sel = api.tagName(node).toLowerCase() + id + c
    const attrs: any = {}
    const dataset: any = {}
    const data: any = {}
    const children: Array<VNode> = []
    let name: string
    let i: number, n: number
    const elmAttrs = node.attributes
    const elmChildren = node.childNodes
    // NOTE: upstream reads attr.nodeName / attr.nodeValue. Attr.name /
    // Attr.value are identical per the DOM spec, but happy-dom (the repo test
    // environment) returns '' / null for the nodeName / nodeValue aliases, so
    // the spec-equal accessors are used here.
    for (i = 0, n = elmAttrs.length; i < n; i++) {
      name = elmAttrs[i]!.name
      if (name.startsWith('data-')) {
        dataset[datasetKey(name)] = elmAttrs[i]!.value || ''
      } else if (name !== 'id' && name !== 'class') {
        attrs[name] = elmAttrs[i]!.value
      }
    }
    for (i = 0, n = elmChildren.length; i < n; i++) {
      children.push(toVNode(elmChildren[i]!, domApi))
    }
    if (Object.keys(attrs).length > 0) data.attrs = attrs
    if (Object.keys(dataset).length > 0) data.dataset = dataset
    if (
      sel.startsWith('svg') &&
      (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
    ) {
      addNS(data, children, sel)
    }
    return vnode(sel, data, children, undefined, node)
  } else if (api.isText(node)) {
    text = api.getTextContent(node) as string
    return vnode(undefined, undefined, undefined, text, node)
  } else if (api.isComment(node)) {
    text = api.getTextContent(node) as string
    return vnode('!', {}, [], text, node as any)
  } else {
    return vnode('', {}, [], undefined, node as any)
  }
}
