/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {
  htmlAttributeValue,
  serializedStylePropertyName,
} from '../domReflection.js'
import { markDirty } from './dirtyFlag.js'
import type { Module } from './module.js'
import { type VNode, type VNodeData, VNodeDataMask } from './vnode.js'

export type ElementStyle = Partial<CSSStyleDeclaration>

export type VNodeStyle = ElementStyle &
  Record<string, string> & {
    delayed?: ElementStyle & Record<string, string>
    remove?: ElementStyle & Record<string, string>
    destroy?: ElementStyle & Record<string, string>
  }

// Binding `requestAnimationFrame` like this fixes a bug in IE/Edge. See #360 and #409.
const raf =
  typeof window !== 'undefined' &&
  typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : setTimeout
const nextFrame = function (fn: () => void) {
  raf(function () {
    raf(fn)
  })
}
let reflowForced = false

function setStyle(
  style: CSSStyleDeclaration,
  propertyName: string,
  value: unknown,
): void {
  style.setProperty(serializedStylePropertyName(propertyName), String(value))
}

function removeStyle(style: CSSStyleDeclaration, propertyName: string): void {
  style.removeProperty(serializedStylePropertyName(propertyName))
}

function setNextFrame(
  style: CSSStyleDeclaration,
  propertyName: string,
  value: unknown,
): void {
  nextFrame(function () {
    setStyle(style, propertyName, value)
  })
}

function createStyle(_oldVnode: VNode, vnode: VNode): void {
  const element = vnode.elm as HTMLElement
  const style = (vnode.data as VNodeData).style
  if (!style) {
    return
  }
  for (const name of Object.keys(style)) {
    if (name !== 'delayed' && name !== 'destroy' && name !== 'remove') {
      setStyle(element.style, name, style[name])
      markDirty()
    }
  }
  const delayed = Object.hasOwn(style, 'delayed') ? style.delayed : undefined
  if (typeof delayed === 'object' && delayed !== null) {
    for (const name of Object.keys(delayed)) {
      setNextFrame(element.style, name, delayed[name])
    }
  }
}

function updateStyle(oldVnode: VNode, vnode: VNode): void {
  let cur: any
  let name: string
  const elm = vnode.elm
  let oldStyle = (oldVnode.data as VNodeData).style
  let style = (vnode.data as VNodeData).style

  if (!oldStyle && !style) return
  if (oldStyle === style) return
  if (
    style === undefined &&
    htmlAttributeValue((vnode.data as VNodeData).attrs, 'style') !== undefined
  ) {
    return
  }
  oldStyle = oldStyle || ({} as VNodeStyle)
  style = style || ({} as VNodeStyle)
  const oldHasDel = Object.hasOwn(oldStyle, 'delayed')

  for (name of Object.keys(oldStyle)) {
    if (
      name !== 'delayed' &&
      name !== 'destroy' &&
      name !== 'remove' &&
      !Object.hasOwn(style, name)
    ) {
      removeStyle((elm as HTMLElement).style, name)
      markDirty()
    }
  }
  for (name of Object.keys(style)) {
    cur = style[name]
    if (
      name === 'delayed' &&
      typeof style.delayed === 'object' &&
      style.delayed !== null
    ) {
      for (const name2 of Object.keys(style.delayed)) {
        cur = style.delayed[name2]
        if (!oldHasDel || cur !== (oldStyle.delayed as any)[name2]) {
          setNextFrame((elm as HTMLElement).style, name2, cur)
          markDirty()
        }
      }
    } else if (
      name !== 'destroy' &&
      name !== 'remove' &&
      cur !== oldStyle[name]
    ) {
      setStyle((elm as HTMLElement).style, name, cur)
      markDirty()
    }
  }
}

function applyDestroyStyle(vnode: VNode): void {
  let style: any
  let name: string
  const elm = vnode.elm
  const s = (vnode.data as VNodeData).style
  if (!s || !Object.hasOwn(s, 'destroy') || !(style = s['destroy'])) return
  for (name of Object.keys(style)) {
    setStyle((elm as HTMLElement).style, name, style[name])
  }
}

function applyRemoveStyle(vnode: VNode, rm: () => void): void {
  const s = (vnode.data as VNodeData).style
  if (!s || !Object.hasOwn(s, 'remove') || !s.remove) {
    rm()
    return
  }
  if (!reflowForced) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    ;(vnode.elm as any).offsetLeft
    reflowForced = true
  }
  let name: string
  const elm = vnode.elm
  let i = 0
  const style = s.remove
  let amount = 0
  const applied: Array<string> = []
  for (name of Object.keys(style)) {
    const propertyName = serializedStylePropertyName(name)
    applied.push(propertyName)
    setStyle((elm as HTMLElement).style, name, style[name])
  }
  const compStyle = getComputedStyle(elm as Element)
  const props = (compStyle as any)['transition-property'].split(', ')
  for (; i < props.length; ++i) {
    if (applied.indexOf(props[i]) !== -1) amount++
  }
  ;(elm as HTMLElement).addEventListener(
    'transitionend',
    function (ev: TransitionEvent) {
      if (ev.target === elm) --amount
      if (amount === 0) rm()
    },
  )
}

function forceReflow() {
  reflowForced = false
}

export const styleModule: Module = {
  dataMask: VNodeDataMask.Style,
  pre: forceReflow,
  create: createStyle,
  update: updateStyle,
  destroy: applyDestroyStyle,
  remove: applyRemoveStyle,
}
