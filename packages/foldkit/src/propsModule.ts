import {
  clearControlledDefault,
  restoreControlledStateFromRawAttribute,
} from './controlledDomState.js'
import {
  GLOBAL_ATTRIBUTE_PROPERTIES,
  HTML_NAMESPACE,
  htmlAttributeValue,
  reflectedAttributeName,
} from './domReflection.js'
import { writeNativeInnerHtml } from './nativeInnerHtml.js'
import {
  hasTrustedInnerHtml,
  isClientOnlyProperty,
} from './propertyProvenance.js'
import { markDirty } from './snabbdom/dirtyFlag.js'
import type { Module } from './snabbdom/index.js'
import { VNodeDataMask } from './snabbdom/vnode.js'

const writeProperty = (element: object, name: string, value: unknown): void => {
  if (name === '__proto__') {
    Object.defineProperty(element, name, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    })
  } else {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const elementProperties = element as Record<string, unknown>
    elementProperties[name] = value
  }
}

const isAutonomousCustomElement = (element: Element): boolean =>
  (element.namespaceURI === null || element.namespaceURI === HTML_NAMESPACE) &&
  element.localName.includes('-')

const isNativeCustomElementAttribute = (
  element: Element,
  properties: Readonly<Record<string, unknown>>,
  name: string,
): boolean =>
  isAutonomousCustomElement(element) &&
  GLOBAL_ATTRIBUTE_PROPERTIES.has(name) &&
  !isClientOnlyProperty(properties, name)

const writeAttribute = (
  element: Element,
  name: string,
  value: unknown,
): void => {
  const attributeName = reflectedAttributeName(name)
  if (attributeName === undefined) {
    return
  }
  if (name === 'draggable') {
    element.setAttribute(attributeName, String(value))
  } else if (value === true) {
    element.setAttribute(attributeName, '')
  } else if (value === false) {
    element.removeAttribute(attributeName)
  } else {
    element.setAttribute(attributeName, String(value))
  }
}

const resetProperty = (element: object, name: string, value: unknown): void => {
  if (name === '__proto__') {
    Reflect.deleteProperty(element, name)
  } else if (typeof value === 'boolean') {
    writeProperty(element, name, false)
  } else if (typeof value === 'string') {
    writeProperty(element, name, '')
  } else if (typeof value === 'number') {
    writeProperty(element, name, 0)
  }
}

/** A props module that extends Snabbdom's built-in module with cleanup of
 *  removed properties and explicit controlled-state ownership transitions.
 *
 *  Snabbdom's propsModule only iterates over new props. It never resets
 *  old props that disappeared between renders. This means `elm.disabled = true`
 *  persists even after `Disabled(true)` is removed from the attribute array.
 *  Since a disabled button swallows click events at the browser level, an
 *  `OnClick` handler that replaces `Disabled` at the same index silently fails.
 *
 *  This module adds a second loop (mirroring what snabbdom's attributesModule
 *  already does) that resets removed props to type-appropriate defaults:
 *  booleans become false, strings become empty, and numbers become zero. For
 *  reflected form and media state it also keeps the parsed default state in
 *  step with the controlled value, then restores raw-attribute ownership when
 *  the typed property leaves. */
function updateProps(
  oldVnode: Parameters<NonNullable<Module['update']>>[0],
  vnode: Parameters<NonNullable<Module['update']>>[1],
): void {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const elm = vnode.elm as any
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let oldProps = (oldVnode.data as any)?.props as
    Record<string, any> | undefined
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let props = (vnode.data as any)?.props as Record<string, any> | undefined
  if (!oldProps && !props) {
    return
  }
  if (oldProps === props) {
    return
  }
  oldProps = oldProps ?? {}
  props = props ?? {}

  if (elm instanceof Element) {
    for (const key of Object.keys(oldProps)) {
      if (
        key === 'innerHTML' &&
        Object.hasOwn(props, key) &&
        hasTrustedInnerHtml(oldProps) !== hasTrustedInnerHtml(props)
      ) {
        if (hasTrustedInnerHtml(oldProps)) {
          writeNativeInnerHtml(elm, '')
          markDirty()
        } else {
          resetProperty(elm, key, oldProps[key])
          markDirty()
        }
      }
      if (
        Object.hasOwn(props, key) &&
        !isClientOnlyProperty(oldProps, key) &&
        isClientOnlyProperty(props, key)
      ) {
        clearControlledDefault(elm, key)
        markDirty()
        if (isNativeCustomElementAttribute(elm, oldProps, key)) {
          const attributeName = reflectedAttributeName(key)
          if (attributeName !== undefined) {
            elm.removeAttribute(attributeName)
          }
        }
      } else if (
        Object.hasOwn(props, key) &&
        isClientOnlyProperty(oldProps, key) &&
        !isClientOnlyProperty(props, key) &&
        isNativeCustomElementAttribute(elm, props, key)
      ) {
        resetProperty(elm, key, oldProps[key])
        markDirty()
      }
    }
  }

  for (const key of Object.keys(props)) {
    const cur = props[key]
    const old = oldProps[key]
    const isOwnershipChanged =
      isClientOnlyProperty(oldProps, key) !== isClientOnlyProperty(props, key)
    if (
      (old !== cur || isOwnershipChanged) &&
      (key !== 'value' || elm[key] !== cur)
    ) {
      if (
        key === 'innerHTML' &&
        elm instanceof Element &&
        hasTrustedInnerHtml(props)
      ) {
        writeNativeInnerHtml(elm, String(cur))
        markDirty()
      } else if (
        elm instanceof Element &&
        isNativeCustomElementAttribute(elm, props, key)
      ) {
        writeAttribute(elm, key, cur)
        markDirty()
      } else {
        writeProperty(elm, key, cur)
        markDirty()
      }
    }
  }

  for (const key of Object.keys(oldProps)) {
    if (!Object.hasOwn(props, key)) {
      const old = oldProps[key]
      if (
        key === 'innerHTML' &&
        elm instanceof Element &&
        hasTrustedInnerHtml(oldProps)
      ) {
        writeNativeInnerHtml(elm, '')
        markDirty()
        continue
      }
      if (
        elm instanceof Element &&
        isNativeCustomElementAttribute(elm, oldProps, key)
      ) {
        const attributeName = reflectedAttributeName(key)
        if (attributeName !== undefined) {
          elm.removeAttribute(attributeName)
          markDirty()
        }
        continue
      }
      if (
        elm instanceof Element &&
        key === 'value' &&
        (elm.localName === 'select' ||
          elm.localName === 'textarea' ||
          elm.localName === 'output')
      ) {
        if (!Object.hasOwn(props, 'innerHTML')) {
          clearControlledDefault(elm, key)
        }
        continue
      }
      const attributeName = reflectedAttributeName(key)
      if (
        attributeName !== undefined &&
        !isClientOnlyProperty(oldProps, key) &&
        elm instanceof Element
      ) {
        if (
          htmlAttributeValue(vnode.data?.attrs, attributeName) !== undefined
        ) {
          restoreControlledStateFromRawAttribute(elm, key)
          markDirty()
          continue
        }
        clearControlledDefault(elm, key)
        elm.removeAttribute(attributeName)
        markDirty()
        continue
      }
      if (elm instanceof Element) {
        clearControlledDefault(elm, key)
      }
      resetProperty(elm, key, old)
      markDirty()
    }
  }
}

export const propsModule: Module = {
  dataMask: VNodeDataMask.Props,
  create: updateProps,
  update: updateProps,
}
