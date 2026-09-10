const innerHtmlDescriptor = (element: Element): PropertyDescriptor => {
  const elementConstructor =
    element.ownerDocument.defaultView?.Element ?? globalThis.Element
  const prototype = elementConstructor.prototype
  let current: object | null = prototype
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, 'innerHTML')
    if (descriptor?.get !== undefined && descriptor.set !== undefined) {
      return descriptor
    }
    current = Object.getPrototypeOf(current)
  }
  throw new Error('[foldkit] The browser does not expose Element.innerHTML.')
}

/** Reads the platform's `Element.innerHTML`, bypassing a same-named property
 *  an autonomous custom element defines.
 *
 * @internal
 */
export const readNativeInnerHtml = (element: Element): string => {
  const value = innerHtmlDescriptor(element).get?.call(element)
  return typeof value === 'string' ? value : ''
}

/** Writes the platform's `Element.innerHTML`, bypassing a same-named property
 *  an autonomous custom element defines.
 *
 * @internal
 */
export const writeNativeInnerHtml = (element: Element, value: string): void => {
  innerHtmlDescriptor(element).set?.call(element, value)
}
