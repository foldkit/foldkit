import { HTML_NAMESPACE, htmlAttributeValue } from './domReflection.js'
import { isClientOnlyProperty } from './propertyProvenance.js'
import type { VNode } from './snabbdom/vnode.js'
import { tagNameFromSelector } from './tagName.js'

const htmlTagName = (element: Element): string | undefined =>
  element.namespaceURI === null || element.namespaceURI === HTML_NAMESPACE
    ? element.localName
    : undefined

const setBooleanDefaultAttribute = (
  element: Element,
  name: string,
  value: boolean,
): void => {
  if (value && !element.hasAttribute(name)) {
    element.setAttribute(name, '')
  } else if (!value && element.hasAttribute(name)) {
    element.removeAttribute(name)
  }
}

/** Synchronizes the default state that parsed HTML necessarily creates for a
 * controlled property.
 *
 * @internal
 */
export const synchronizeControlledDefault = (
  element: Element,
  propertyName: string,
  value: unknown,
): void => {
  const tagName = htmlTagName(element)
  if (
    propertyName === 'value' &&
    (tagName === 'input' || tagName === 'textarea' || tagName === 'output')
  ) {
    const nextValue = String(value)
    if (Reflect.get(element, 'defaultValue') !== nextValue) {
      Reflect.set(element, 'defaultValue', nextValue)
    }
    if (tagName === 'input') {
      if (element.getAttribute('value') !== nextValue) {
        element.setAttribute('value', nextValue)
      }
    }
    return
  }
  if (propertyName === 'checked' && tagName === 'input') {
    const isChecked = Boolean(value)
    if (Reflect.get(element, 'defaultChecked') !== isChecked) {
      Reflect.set(element, 'defaultChecked', isChecked)
    }
    setBooleanDefaultAttribute(element, 'checked', isChecked)
    return
  }
  if (propertyName === 'selected' && tagName === 'option') {
    const isSelected = Boolean(value)
    if (Reflect.get(element, 'defaultSelected') !== isSelected) {
      Reflect.set(element, 'defaultSelected', isSelected)
    }
    setBooleanDefaultAttribute(element, 'selected', isSelected)
    return
  }
  if (
    propertyName === 'muted' &&
    (tagName === 'audio' || tagName === 'video')
  ) {
    const isMuted = Boolean(value)
    if (Reflect.get(element, 'defaultMuted') !== isMuted) {
      Reflect.set(element, 'defaultMuted', isMuted)
    }
    setBooleanDefaultAttribute(element, 'muted', isMuted)
    return
  }
  if (propertyName === 'value' && tagName === 'select') {
    // NOTE: set the live selection before copying it into the defaults. Two
    // options can share one value, so `select.value` may already equal the
    // controlled value while a later child `selected` still owns the live
    // selection. The value setter gives the first matching option ownership.
    Reflect.set(element, 'value', value)
    for (const option of element.querySelectorAll('option')) {
      if (option.defaultSelected !== option.selected) {
        option.defaultSelected = option.selected
      }
      setBooleanDefaultAttribute(option, 'selected', option.selected)
    }
  }
}

/** Clears default state owned by a controlled property that left a vnode.
 *
 * @internal
 */
export const clearControlledDefault = (
  element: Element,
  propertyName: string,
): void => {
  const tagName = htmlTagName(element)
  if (
    propertyName === 'value' &&
    (tagName === 'input' || tagName === 'textarea' || tagName === 'output')
  ) {
    Reflect.set(element, 'defaultValue', '')
    if (tagName === 'input') {
      element.removeAttribute('value')
      Reflect.set(element, 'value', '')
    } else if (tagName === 'output') {
      Reflect.set(element, 'value', '')
    }
    return
  }
  if (propertyName === 'checked' && tagName === 'input') {
    Reflect.set(element, 'defaultChecked', false)
    element.removeAttribute('checked')
    Reflect.set(element, 'checked', false)
    return
  }
  if (propertyName === 'selected' && tagName === 'option') {
    Reflect.set(element, 'defaultSelected', false)
    element.removeAttribute('selected')
    Reflect.set(element, 'selected', false)
    return
  }
  if (
    propertyName === 'muted' &&
    (tagName === 'audio' || tagName === 'video')
  ) {
    Reflect.set(element, 'defaultMuted', false)
    element.removeAttribute('muted')
    Reflect.set(element, 'muted', false)
    return
  }
  if (propertyName === 'value' && tagName === 'select') {
    for (const option of element.querySelectorAll('option')) {
      option.defaultSelected = false
      option.removeAttribute('selected')
    }
  }
}

/** Restores the state fresh uncontrolled content would derive after a
 * controlled value leaves the vnode and its ordinary children are patched.
 *
 * @internal
 */
type OptionOwnership = Readonly<{
  defaultSelected: boolean
  selected: boolean | undefined
}>

const optionOwnershipOf = (vnode: VNode): OptionOwnership => {
  const props = vnode.data?.props
  const hasSelectedProperty =
    props !== undefined && Object.hasOwn(props, 'selected')
  const isSelectedClientOnly = isClientOnlyProperty(props, 'selected')
  const rawSelected =
    htmlAttributeValue(vnode.data?.attrs, 'selected') !== undefined
  return {
    defaultSelected:
      hasSelectedProperty && !isSelectedClientOnly
        ? Boolean(props['selected'])
        : rawSelected,
    selected: hasSelectedProperty ? Boolean(props['selected']) : undefined,
  }
}

const collectOptionOwnership = (
  vnode: VNode,
  collected: Array<OptionOwnership>,
): void => {
  if (
    vnode.sel !== undefined &&
    tagNameFromSelector(vnode.sel).toLowerCase() === 'option'
  ) {
    collected.push(optionOwnershipOf(vnode))
    return
  }
  for (const child of vnode.children ?? []) {
    if (typeof child !== 'string') {
      collectOptionOwnership(child, collected)
    }
  }
}

const restoreUncontrolledSelect = (
  element: HTMLSelectElement,
  vnode: VNode,
): void => {
  const isContentPropertyOwned =
    vnode.data?.props !== undefined &&
    Object.hasOwn(vnode.data.props, 'innerHTML')
  const ownership: Array<OptionOwnership> = []
  if (!isContentPropertyOwned) {
    collectOptionOwnership(vnode, ownership)
    const ownershipIterator = ownership.values()
    for (const option of Array.from(element.options)) {
      const nextOwnership = ownershipIterator.next().value
      const isDefaultSelected = nextOwnership?.defaultSelected ?? false
      if (option.defaultSelected !== isDefaultSelected) {
        option.defaultSelected = isDefaultSelected
      }
      setBooleanDefaultAttribute(option, 'selected', isDefaultSelected)
    }
  }
  const probe = element.cloneNode(true)
  if (!(probe instanceof HTMLSelectElement)) {
    return
  }
  for (let index = 0; index < element.options.length; index += 1) {
    const option = element.options.item(index)
    const probeOption = probe.options.item(index)
    if (option !== null && probeOption !== null) {
      option.selected = probeOption.selected
    }
  }
  const ownershipIterator = ownership.values()
  for (const option of Array.from(element.options)) {
    const selected = ownershipIterator.next().value?.selected
    if (selected !== undefined) {
      option.selected = selected
    }
  }
}

export const restoreUncontrolledContent = (
  element: Element,
  vnode: VNode,
): void => {
  if (element instanceof HTMLTextAreaElement) {
    element.value = element.defaultValue
    return
  }
  if (element instanceof HTMLOutputElement) {
    element.defaultValue = element.textContent ?? ''
    return
  }
  if (element instanceof HTMLSelectElement) {
    restoreUncontrolledSelect(element, vnode)
  }
}

/** Restores live state after a controlled property gives ownership to a raw
 * attribute when that property has separate current and default state.
 *
 * @internal
 */
export const restoreControlledStateFromRawAttribute = (
  element: Element,
  propertyName: string,
): void => {
  const tagName = htmlTagName(element)
  if (propertyName === 'value' && tagName === 'input') {
    const value = Reflect.get(element, 'defaultValue')
    Reflect.set(
      element,
      'value',
      Reflect.get(element, 'type') === 'file' ? '' : value,
    )
    return
  }
  if (propertyName === 'checked' && tagName === 'input') {
    Reflect.set(element, 'checked', Reflect.get(element, 'defaultChecked'))
    return
  }
  if (propertyName === 'selected' && tagName === 'option') {
    Reflect.set(element, 'selected', Reflect.get(element, 'defaultSelected'))
    return
  }
  if (
    propertyName === 'muted' &&
    (tagName === 'audio' || tagName === 'video')
  ) {
    Reflect.set(element, 'muted', Reflect.get(element, 'defaultMuted'))
    return
  }
}

/** Live and default properties jointly owned by a controlled vnode property.
 *
 * @internal
 */
export const controlledStatePropertyNames = (
  element: Element,
  properties: Readonly<Record<string, unknown>> | undefined,
): ReadonlyArray<string> => {
  if (properties === undefined) {
    return []
  }
  const tagName = htmlTagName(element)
  const names: Array<string> = []
  if ('value' in properties) {
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'output') {
      names.push('value', 'defaultValue')
    } else if (tagName === 'select') {
      names.push('value', 'selectedIndex')
    }
  }
  if ('checked' in properties && tagName === 'input') {
    names.push('checked', 'defaultChecked')
  }
  if ('selected' in properties && tagName === 'option') {
    names.push('selected', 'defaultSelected')
  }
  if ('muted' in properties && (tagName === 'audio' || tagName === 'video')) {
    names.push('muted', 'defaultMuted')
  }
  return names
}
