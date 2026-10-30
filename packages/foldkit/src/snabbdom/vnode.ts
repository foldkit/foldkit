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
  OnUnmount: 64,
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

/** Whether two virtual nodes describe the same DOM element. The differ patches
 * when this is true and creates a new element when it is false. */
export const sameVnode = (vnode1: VNode, vnode2: VNode): boolean => {
  if (vnode1 === vnode2) {
    return true
  }
  if (vnode1.sel !== vnode2.sel) {
    return false
  }
  if (vnode1.key !== vnode2.key) {
    return false
  }
  if (vnode1.identity !== vnode2.identity) {
    return false
  }
  if (vnode1.data?.is !== vnode2.data?.is) {
    return false
  }
  return vnode1.sel !== undefined || typeof vnode1.text === typeof vnode2.text
}

/** Marker on {@link VNodeData.foldkitMount} for an element with an `OnMount`
 * attribute. Snabbdom passes the field through without rendering it, so Scene
 * can read it while walking the virtual tree. Carries the Mount Definition's
 * name and args so a test can identify pending mounts. When the mount lives
 * inside a Submodel boundary, it also carries that boundary's
 * `toParentMessage` chain, innermost first, snapshotted at render time, so
 * `Scene.Mount.resolve` can replay the lift the result travels through in
 * production. Production keeps the Mount bound to the dispatcher owned by its
 * acquiring render, then resolves that owner's latest chain when the Mount
 * emits. */
export type FoldkitMountMarker = Readonly<{
  name: string
  args?: Record<string, unknown>
  messageMappers?: ReadonlyArray<(message: unknown) => unknown>
}>

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
  foldkitMount?: FoldkitMountMarker
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
