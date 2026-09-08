import { tagNameFromSelector } from '../tagName.js'
import * as is from './is.js'
import { type VNode, type VNodeData, vnode } from './vnode.js'

export type VNodes = Array<VNode>
export type VNodeChildElement =
  | VNode
  | string
  | number
  | String
  | Number
  | undefined
  | null
export type ArrayOrElement<T> = T | Array<T>
export type VNodeChildren = ArrayOrElement<VNodeChildElement>

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'

// NOTE: inside SVG, the content of foreignObject, desc, and title is parsed in
// the HTML namespace (SVG's HTML integration points), so the SVG namespace must
// not propagate into their children.
const SVG_HTML_INTEGRATION_POINTS = new Set(['foreignObject', 'desc', 'title'])

// NOTE: inside a MathML text integration point (mi, mo, mn, ms, mtext) the
// content is parsed as HTML, so the MathML namespace stops there, except for
// mglyph and malignmark, which the parser keeps in the MathML namespace. A
// MathML annotation-xml element is an HTML integration point when its encoding
// is text/html or application/xhtml+xml, so its children are HTML too.
const MATHML_TEXT_INTEGRATION_POINTS = new Set([
  'mi',
  'mo',
  'mn',
  'ms',
  'mtext',
])
const MATHML_TEXT_INTEGRATION_EXCEPTIONS = new Set(['mglyph', 'malignmark'])
const MATHML_HTML_ENCODINGS = new Set(['text/html', 'application/xhtml+xml'])

const propagateNamespace = (
  data: any,
  children: Array<VNode | string> | undefined,
  sel: string | undefined,
  namespace: string,
  integrationPoints: ReadonlySet<string>,
): void => {
  data.ns = namespace
  if (
    (sel === undefined || !integrationPoints.has(sel)) &&
    children !== undefined
  ) {
    for (let i = 0; i < children.length; ++i) {
      const child = children[i]!
      if (typeof child === 'string') continue
      const childData = child.data
      if (childData !== undefined) {
        propagateNamespace(
          childData,
          child.children,
          child.sel,
          namespace,
          integrationPoints,
        )
      }
    }
  }
}

export function addNS(
  data: any,
  children: Array<VNode | string> | undefined,
  sel: string | undefined,
): void {
  propagateNamespace(
    data,
    children,
    sel,
    SVG_NAMESPACE,
    SVG_HTML_INTEGRATION_POINTS,
  )
}

// NOTE: an annotation-xml is an HTML integration point when its encoding
// attribute is text/html or application/xhtml+xml. HTML attribute names are
// case-insensitive, so the name is matched case-insensitively as well as the
// value.
const isHtmlIntegrationAnnotationXml = (data: any): boolean => {
  const attrs = data?.attrs
  if (attrs === undefined || attrs === null) {
    return false
  }
  for (const name of Object.keys(attrs)) {
    if (name.toLowerCase() === 'encoding') {
      const value = attrs[name]
      return (
        typeof value === 'string' &&
        MATHML_HTML_ENCODINGS.has(value.toLowerCase())
      )
    }
  }
  return false
}

// NOTE: MathML namespace propagation carries the integration-point exceptions
// the generic walk cannot express: children of a text integration point are
// HTML except mglyph and malignmark, and children of an annotation-xml with an
// HTML encoding are HTML. Everything else inherits the MathML namespace.
const propagateMathmlNamespace = (
  data: any,
  children: Array<VNode | string> | undefined,
  sel: string | undefined,
): void => {
  data.ns = MATHML_NAMESPACE
  if (children === undefined) {
    return
  }
  const tag = sel === undefined ? undefined : tagNameFromSelector(sel)
  if (tag === 'annotation-xml' && isHtmlIntegrationAnnotationXml(data)) {
    return
  }
  const isTextIntegrationPoint =
    tag !== undefined && MATHML_TEXT_INTEGRATION_POINTS.has(tag)
  for (let i = 0; i < children.length; ++i) {
    const child = children[i]!
    if (typeof child === 'string') continue
    const childData = child.data
    if (childData === undefined) continue
    if (isTextIntegrationPoint) {
      const childTag =
        child.sel === undefined ? undefined : tagNameFromSelector(child.sel)
      if (
        childTag === undefined ||
        !MATHML_TEXT_INTEGRATION_EXCEPTIONS.has(childTag)
      ) {
        continue
      }
    }
    propagateMathmlNamespace(childData, child.children, child.sel)
  }
}

export function addMathmlNS(
  data: any,
  children: Array<VNode | string> | undefined,
  sel: string | undefined,
): void {
  propagateMathmlNamespace(data, children, sel)
}

export function h(sel: string): VNode
export function h(sel: string, data: VNodeData | null): VNode
export function h(sel: string, children: VNodeChildren): VNode
export function h(
  sel: string,
  data: VNodeData | null,
  children: VNodeChildren,
): VNode
export function h(sel: any, b?: any, c?: any): VNode {
  let data: VNodeData = {}
  let children: any
  let text: any
  let i: number
  if (c !== undefined) {
    if (b !== null) {
      data = b
    }
    if (is.array(c)) {
      children = c
    } else if (is.primitive(c)) {
      text = c.toString()
    } else if (c && c.sel) {
      children = [c]
    }
  } else if (b !== undefined && b !== null) {
    if (is.array(b)) {
      children = b
    } else if (is.primitive(b)) {
      text = b.toString()
    } else if (b && b.sel) {
      children = [b]
    } else {
      data = b
    }
  }
  if (children !== undefined) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i]))
        children[i] = vnode(
          undefined,
          undefined,
          undefined,
          children[i],
          undefined,
        )
    }
  }
  if (
    sel.startsWith('svg') &&
    (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
  ) {
    addNS(data, children, sel)
  } else if (
    sel.startsWith('math') &&
    (sel.length === 4 || sel[4] === '.' || sel[4] === '#')
  ) {
    addMathmlNS(data, children, sel)
  }
  return vnode(sel, data, children, text, undefined)
}
