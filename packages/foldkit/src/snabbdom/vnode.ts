import type { Attrs } from './attributes.js'
import type { Classes } from './class.js'
import type { Dataset } from './dataset.js'
import type { On } from './eventlisteners.js'
import type { Hooks } from './hooks.js'
import type { Props } from './props.js'
import type { VNodeStyle } from './style.js'

export type Key = PropertyKey

export const vnodeDataMaskKey = Symbol('foldkit/vnode-data-mask')

export const VNodeDataMask = {
  Attrs: 1,
  Class: 2,
  Dataset: 4,
  On: 8,
  Props: 16,
  Style: 32,
}

export interface VNode {
  sel: string | undefined
  data: VNodeData | undefined
  children: Array<VNode | string> | undefined
  elm: Node | undefined
  text: string | undefined
  key: Key | undefined
  /** Framework-managed identity stamped by `foldkit/brand`. Independent of
   *  `key`: it never enters the keyed index, and joins the `sameVnode`
   *  compatibility check exactly where `sel` is consulted. A mismatch
   *  replaces the node instead of patching it. */
  identity?: string
}

export interface VNodeData<VNodeProps = Props> {
  [vnodeDataMaskKey]?: number
  props?: VNodeProps
  attrs?: Attrs
  class?: Classes
  style?: VNodeStyle
  dataset?: Dataset
  on?: On
  hook?: Hooks
  key?: Key
  ns?: string // for SVGs
  is?: string // for custom elements v1
  [key: string]: any // for any other 3rd party module
}

export function vnode(
  sel: string | undefined,
  data: any | undefined,
  children: Array<VNode | string> | undefined,
  text: string | undefined,
  elm: Element | DocumentFragment | Text | undefined,
): VNode {
  const key = data === undefined ? undefined : data.key
  return { sel, data, children, text, elm, key }
}
