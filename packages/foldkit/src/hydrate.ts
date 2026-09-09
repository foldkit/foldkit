import { Option } from 'effect'

import { HYDRATION_BUILD_ATTRIBUTE } from './buildToken.js'
import { controlledStatePropertyNames } from './controlledDomState.js'
import {
  BOOLEAN_PROPERTIES,
  htmlAttributeValue,
  parsedAttributeName,
  reflectedAttributeName,
  serializedHtmlPropertyValue,
  serializedStylePropertyName,
} from './domReflection.js'
import {
  HYDRATION_IDENTITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  hydrationIdentityMarker,
  hydrationKeyMarker,
} from './hydrationMarkers.js'
import { readNativeInnerHtml, writeNativeInnerHtml } from './nativeInnerHtml.js'
import {
  hasTrustedInnerHtml,
  isClientOnlyProperty,
  markTrustedInnerHtml,
} from './propertyProvenance.js'
import type { VNode } from './snabbdom/index.js'
import { h, toVNode } from './snabbdom/index.js'
import { tagNameFromSelector } from './tagName.js'
import { dedupeSharedVNodes, patch } from './vdom.js'

// NOTE: the differ only knows the page through the `elm` pointers on its
// vnodes; `patch` never queries the document. On a server-rendered page the
// browser has already built real DOM by parsing the HTML the server sent
// (the "server DOM" below), but snabbdom did not create those nodes, so no
// vnode anywhere points at them and the differ cannot see them. Hydration's
// whole job is to make that DOM visible to the differ, then let one
// ordinary patch attach behavior to it.
//
// The mechanism has three steps. First, walk the first render's vnode tree
// and the server DOM together, position by position. Second, wherever the
// two agree, record the existing DOM node: those records form a second
// vnode tree, a clone of the first render's tree whose `elm` fields point
// at the server DOM nodes. The clone copies exactly what `sameVnode`
// compares (`sel`, `key`, `identity`, `data.is`), so `patchVnode` reuses
// every adopted element, and deliberately nothing else, so every module
// update hook re-asserts the new tree's attrs, props, classes, styles, and
// listeners onto the adopted elements. Third, run `patch(clone, newTree)`:
// to the differ this is a completely ordinary update from a tree that
// happens to point at existing nodes, so the vendored differ stays
// untouched and never learns the nodes came from a server.
//
// Where the DOM disagrees with the vnode tree, the walk clears the nearest
// ordinary parent's children and hands `patch` an empty child list, so the
// subtree is rebuilt through `createElm`. A Custom Element whose light DOM is
// declared by the view is a replacement boundary instead: the host and its
// children are built while detached, exactly as they are during a fresh
// render. Trailing vnode children with no DOM counterpart are simply absent
// from the clone; `updateChildren` appends them.

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
const HYDRATION_STAMP_ATTRIBUTE = 'data-foldkit-app'

const classListOf = (element: Element): Record<string, boolean> => {
  const classes: Record<string, boolean> = {}
  for (const className of Array.from(element.classList)) {
    classes[className] = true
  }
  return classes
}

const inlineStyleOf = (element: Element): Record<string, string> => {
  const style: Record<string, string> = {}
  if ('style' in element && element.style instanceof CSSStyleDeclaration) {
    const inlineStyle = element.style
    for (let index = 0; index < inlineStyle.length; index += 1) {
      const property = inlineStyle.item(index)
      const value = inlineStyle.getPropertyValue(property)
      const priority = inlineStyle.getPropertyPriority(property)
      style[property] = priority === '' ? value : `${value} !${priority}`
    }
  }
  return style
}

// NOTE: for a custom element, seed only the class tokens the vnode declares so
// the class module leaves component-added tokens in place; the view does not
// reassert them, so the full class list would reconcile them away as stale.
// Reading each token from the element keeps an agreeing render a no-op. A normal
// element seeds its whole class list, so stale tokens reconcile away.
const seedClasses = (
  element: Element,
  vnode: VNode,
  classOwnedByModule: boolean,
  isCustomElement: boolean,
): Record<string, boolean> => {
  if (!classOwnedByModule) {
    return {}
  }
  if (!isCustomElement) {
    return classListOf(element)
  }
  const declared: Record<string, boolean> = {}
  for (const token of Object.keys(vnode.data?.class ?? {})) {
    declared[token] = element.classList.contains(token)
  }
  return declared
}

// NOTE: the style counterpart to seedClasses. For a custom element, seed only
// the style properties the vnode declares so the style module leaves
// component-added properties in place; a normal element seeds its whole inline
// style so stale properties reconcile away.
const seedStyle = (
  element: Element,
  vnode: VNode,
  styleOwnedByModule: boolean,
  isCustomElement: boolean,
): Record<string, string> => {
  if (!styleOwnedByModule) {
    return {}
  }
  const vnodeStyle = vnode.data?.style ?? {}
  const declared = Object.fromEntries(
    Object.entries(vnodeStyle).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[serializedStylePropertyName(key), value]]
        : [],
    ),
  )
  const style = Reflect.get(element, 'style')
  if (!(style instanceof CSSStyleDeclaration)) {
    return {}
  }
  const seeded: Record<string, string> = isCustomElement
    ? {}
    : inlineStyleOf(element)
  const expected = element.ownerDocument.createElement('span').style
  const ownedProperties = new Set<string>()
  for (const [propertyName, value] of Object.entries(declared)) {
    expected.setProperty(propertyName, value)
    const ownershipProbe = element.ownerDocument.createElement('span').style
    ownershipProbe.setProperty(propertyName, value)
    ownedProperties.add(propertyName)
    for (let index = 0; index < ownershipProbe.length; index += 1) {
      ownedProperties.add(ownershipProbe.item(index))
    }
  }
  for (const propertyName of ownedProperties) {
    delete seeded[propertyName]
  }
  const isEquivalent = Object.keys(declared).every(
    propertyName =>
      style.getPropertyValue(propertyName) ===
        expected.getPropertyValue(propertyName) &&
      style.getPropertyPriority(propertyName) ===
        expected.getPropertyPriority(propertyName),
  )
  if (isEquivalent) {
    Object.assign(seeded, declared)
  }
  return seeded
}

const createInertProbe = (element: Element): Element => {
  const inertDocument =
    element.ownerDocument.implementation.createHTMLDocument()
  const base = inertDocument.createElement('base')
  base.href = element.ownerDocument.baseURI
  inertDocument.head.appendChild(base)
  if (
    element.namespaceURI === null ||
    element.namespaceURI === HTML_NAMESPACE
  ) {
    return inertDocument.createElement(element.localName)
  }
  return inertDocument.createElementNS(element.namespaceURI, element.localName)
}

const reflectedPropertyNames = (vnode: VNode): ReadonlyArray<string> => {
  const properties = vnode.data?.props
  if (properties === undefined) {
    return []
  }
  return Object.keys(properties).filter(
    name =>
      !isClientOnlyProperty(properties, name) &&
      reflectedAttributeName(name) !== undefined,
  )
}

const reflectedAttributeValue = (
  tagName: string,
  propertyName: string,
  value: unknown,
): string | null => {
  if (BOOLEAN_PROPERTIES.has(propertyName)) {
    return value === true ? '' : null
  }
  if (value === false) {
    return propertyName === 'draggable' ? 'false' : String(value)
  }
  if (propertyName === 'draggable') {
    return value === true ? 'true' : 'false'
  }
  return serializedHtmlPropertyValue(tagName, propertyName, value)
}

const isControlledCurrentState = (
  element: Element,
  propertyName: string,
): boolean => {
  const tagName = element.localName
  return (
    (propertyName === 'value' &&
      (tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'output' ||
        tagName === 'select')) ||
    (propertyName === 'checked' && tagName === 'input') ||
    (propertyName === 'selected' && tagName === 'option') ||
    (propertyName === 'muted' && (tagName === 'audio' || tagName === 'video'))
  )
}

const STALE_REFLECTED_PROPERTY = Symbol('foldkit/stale-reflected-property')

type AdoptedSignature = Readonly<{ vnode: VNode; server: string }>
type ControlledSelectState = Readonly<{
  selectedIndex: number
  value: string
}>
type HydrationStatus = {
  isMismatchDetected: boolean
  adoptedSignatures: Map<Element, AdoptedSignature>
  controlledOptionSelection: Map<Element, boolean>
  controlledSelectState: Map<Element, ControlledSelectState>
}

const NO_SELECTED_OPTION = -1

// NOTE: a controlled select owns the effective state of every descendant
// option. The serializer marks the first matching option, and the browser's
// value setter does the same during a fresh render. Compare hydration against
// that parent-owned state instead of each option's shadowed `selected` prop.
const registerControlledSelectState = (
  element: Element,
  vnode: VNode,
  status: HydrationStatus,
): void => {
  const properties = vnode.data?.props
  const authoredValue = properties?.['value']
  if (
    !(element instanceof HTMLSelectElement) ||
    typeof authoredValue !== 'string' ||
    isClientOnlyProperty(properties, 'value')
  ) {
    return
  }

  const options = Array.from(element.options)
  const selectedOption = options.find(option => option.value === authoredValue)
  for (const option of options) {
    status.controlledOptionSelection.set(option, option === selectedOption)
  }
  status.controlledSelectState.set(element, {
    selectedIndex: selectedOption?.index ?? NO_SELECTED_OPTION,
    value: selectedOption?.value ?? '',
  })
}

const detectControlledSelectMismatch = (
  element: Element,
  status: HydrationStatus,
): void => {
  const selectState = status.controlledSelectState.get(element)
  if (
    selectState !== undefined &&
    (Reflect.get(element, 'value') !== selectState.value ||
      Reflect.get(element, 'selectedIndex') !== selectState.selectedIndex)
  ) {
    detectMismatch(status)
  }

  const isSelected = status.controlledOptionSelection.get(element)
  if (isSelected !== undefined) {
    if (
      Reflect.get(element, 'selected') !== isSelected ||
      Reflect.get(element, 'defaultSelected') !== isSelected
    ) {
      detectMismatch(status)
    }
  }
}

const seedReflectedProperties = (
  element: Element,
  vnode: VNode,
  propertyNames: ReadonlyArray<string>,
  isCustomElement: boolean,
  status: HydrationStatus,
): Record<string, unknown> => {
  const properties = vnode.data?.props
  if (properties === undefined || propertyNames.length === 0) {
    return {}
  }

  const seeded: Record<string, unknown> = {}
  for (const name of propertyNames) {
    const authored = properties[name]
    const attributeName = reflectedAttributeName(name)
    if (attributeName === undefined) {
      continue
    }
    const isOwnedByControlledSelect =
      (name === 'value' && status.controlledSelectState.has(element)) ||
      (name === 'selected' && status.controlledOptionSelection.has(element))
    if (isOwnedByControlledSelect) {
      seeded[name] = authored
      continue
    }
    const isEquivalent =
      !isCustomElement && isControlledCurrentState(element, name)
        ? Object.is(Reflect.get(element, name), authored)
        : element.getAttribute(attributeName) ===
          reflectedAttributeValue(element.localName, name, authored)
    if (isEquivalent) {
      seeded[name] = authored
    } else {
      seeded[name] = STALE_REFLECTED_PROPERTY
      detectMismatch(status)
    }
  }
  return seeded
}

const byName = (
  [leftName]: readonly [string, string],
  [rightName]: readonly [string, string],
): number => leftName.localeCompare(rightName)

// A structured, order-independent snapshot of the state an element and its
// vnode share: the DOM attributes, the non-reflecting properties the vnode
// owns (read from the element, not the attribute), the class set, and inline
// style. Comparing the snapshot taken during adoption (the server DOM) with
// the element's state after the client patch flags any attribute, property,
// class, or style the two disagree on. Both sides pass through the same DOM
// APIs, so spelling differences never register, and the snapshot is JSON so no
// value can collide with a delimiter. Values feed the comparison, never a log.
export const __elementSignature = (element: Element, vnode: VNode): string => {
  const propertyNames = controlledStatePropertyNames(element, vnode.data?.props)

  const attributes: Array<[string, string]> = []
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name
    if (
      name === HYDRATION_STAMP_ATTRIBUTE ||
      name === 'class' ||
      name === 'style'
    ) {
      continue
    }
    attributes.push([name, attribute.value])
  }
  attributes.sort(byName)

  const properties: Array<[string, string]> = []
  for (const name of propertyNames) {
    properties.push([name, String(Reflect.get(element, name))])
  }
  properties.sort(byName)

  const styles = Object.entries(inlineStyleOf(element)).sort(byName)

  const classes = Array.from(element.classList).sort()

  return JSON.stringify({ attributes, properties, classes, styles })
}

// NOTE: reconcile stale server DOM against the client's first render by
// seeding the adopted clone with the element's current attributes, classes,
// and inline styles. Server DOM state is all view-produced, so the diff
// modules remove any value the client tree does not reassert, converging a
// nondeterministic render instead of leaving stale, behavior-affecting state
// (a stale href, a stale class) on the page. class and inline style are
// seeded into their own module only when the client view owns them solely
// through that module. When the view also sets `class` or `style` through a
// raw attribute, or does not use the module at all, the whole attribute rides
// in attrs and the module (if present) re-asserts its tokens on top, so no
// value is written by one module and then removed as stale state by another.
// The hydration stamp is never seeded, so it is never removed.
const seedAdoptedState = (
  element: Element,
  vnode: VNode,
  clone: VNode,
  status: HydrationStatus,
  isCustomElement: boolean,
): void => {
  detectControlledSelectMismatch(element, status)
  const classOwnedByModule =
    vnode.data?.class !== undefined &&
    htmlAttributeValue(vnode.data?.attrs, 'class') === undefined
  const styleOwnedByModule =
    vnode.data?.style !== undefined &&
    htmlAttributeValue(vnode.data?.attrs, 'style') === undefined
  const propertyNames = reflectedPropertyNames(vnode)
  const propertyAttributeNames = new Set(
    propertyNames.flatMap(name => {
      const attributeName = reflectedAttributeName(name)
      return attributeName === undefined
        ? []
        : [parsedAttributeName(element.namespaceURI, attributeName)]
    }),
  )
  const datasetAttributeNames = new Map(
    Object.keys(vnode.data?.dataset ?? {}).map(name => [
      `data-${name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`,
      name,
    ]),
  )

  // NOTE: a custom element that upgraded before hydration adds attributes of its
  // own in connectedCallback. Seeding only the attributes the vnode declares
  // leaves those component-owned attributes in place, while a vnode-declared
  // attribute still reconciles.
  const declaredAttributes = isCustomElement
    ? new Set(
        Object.keys(vnode.data?.attrs ?? {}).map(name => name.toLowerCase()),
      )
    : undefined

  const attrs: Record<string, string> = {}
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name
    if (name === HYDRATION_STAMP_ATTRIBUTE) {
      continue
    }
    if (name === 'class' && classOwnedByModule) {
      continue
    }
    if (name === 'style' && styleOwnedByModule) {
      continue
    }
    if (propertyAttributeNames.has(name)) {
      continue
    }
    if (datasetAttributeNames.has(name)) {
      continue
    }
    if (
      declaredAttributes !== undefined &&
      !declaredAttributes.has(name.toLowerCase())
    ) {
      continue
    }
    attrs[name] = attribute.value
  }

  const classes = seedClasses(
    element,
    vnode,
    classOwnedByModule,
    isCustomElement,
  )
  const style = seedStyle(element, vnode, styleOwnedByModule, isCustomElement)
  const props = seedReflectedProperties(
    element,
    vnode,
    propertyNames,
    isCustomElement,
    status,
  )
  const dataset: Record<string, string> = {}
  for (const [attributeName, propertyName] of datasetAttributeNames) {
    const value = element.getAttribute(attributeName)
    if (value !== null) {
      dataset[propertyName] = value
    }
  }

  clone.data = {
    ...clone.data,
    ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
    ...(Object.keys(classes).length > 0 ? { class: classes } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
    ...(Object.keys(props).length > 0
      ? { props: { ...clone.data?.props, ...props } }
      : {}),
    ...(Object.keys(dataset).length > 0 ? { dataset } : {}),
  }

  // In development, record the server DOM signature so the post-patch pass can
  // report an attribute-only mismatch the structural walk cannot see. Gated on
  // the dev flag so a production hydrate does no extra work.
  if (import.meta.hot && !status.adoptedSignatures.has(element)) {
    status.adoptedSignatures.set(element, {
      vnode,
      server: __elementSignature(element, vnode),
    })
  }
}

const detectMismatch = (status: HydrationStatus): void => {
  status.isMismatchDetected = true
}

const reportMismatch = (status: HydrationStatus): void => {
  if (import.meta.hot && status.isMismatchDetected) {
    console.warn(
      '[foldkit] The server DOM did not match the first client view during ' +
        'hydration. Foldkit reconciled the mismatching subtree. Ensure Flags, ' +
        'init, and view produce deterministic initial markup.',
    )
  }
}

const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE

const isComment = (node: Node): node is Comment =>
  node.nodeType === Node.COMMENT_NODE

const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

const hasOnlyTextContent = (element: Element): boolean => {
  const firstChild = element.firstChild
  return (
    firstChild === null ||
    (firstChild.nextSibling === null && isText(firstChild))
  )
}

const matchesTag = (element: Element, vnode: VNode): boolean => {
  const authored = tagNameFromSelector(vnode.sel ?? '')
  const expected =
    vnode.data?.ns === undefined ? authored.toLowerCase() : authored
  return element.localName === expected
}

// The namespace a vnode expects is carried in `data.ns` for foreign content
// (SVG, MathML) and is otherwise HTML. An element whose namespace disagrees
// (an HTML element parsed inside an SVG integration point, say) must be
// rebuilt rather than adopted, since the two are not interchangeable.
const namespaceOf = (vnode: VNode): string =>
  typeof vnode.data?.ns === 'string' ? vnode.data.ns : HTML_NAMESPACE

const matchesNamespace = (element: Element, vnode: VNode): boolean =>
  (element.namespaceURI ?? HTML_NAMESPACE) === namespaceOf(vnode)

// The server DOM does not encode a vnode's key or identity, so a positional
// match on tag and namespace alone could adopt a different logical entity: a
// reordered or stale keyed list would take over the wrong DOM node, and the user
// state sitting on it. The serializer stamps a fingerprint of the key and
// identity; here the same fingerprint is computed for the vnode and compared,
// so a mismatch rebuilds instead of transferring state to the wrong row or
// branch. An unsupported key (NaN or a symbol, which a hydratable render
// refuses) never matches, so it rebuilds rather than adopting on a guess.
const matchesAdoptionKey = (element: Element, vnode: VNode): boolean => {
  const serverKey = element.getAttribute(HYDRATION_KEY_ATTRIBUTE)
  if (vnode.key === undefined) {
    return serverKey === null
  }
  const clientKey = hydrationKeyMarker(vnode.key)
  if (clientKey === undefined) {
    // An unsupported key (NaN or a symbol, which a hydratable render refuses)
    // cannot be compared, so it never matches: rebuilding beats adopting on a
    // guess.
    return false
  }
  return serverKey === clientKey
}

const matchesAdoptionIdentity = (element: Element, vnode: VNode): boolean => {
  if (!matchesAdoptionKey(element, vnode)) {
    return false
  }
  const serverIdentity = element.getAttribute(HYDRATION_IDENTITY_ATTRIBUTE)
  const clientIdentity =
    vnode.identity === undefined
      ? null
      : hydrationIdentityMarker(vnode.identity)
  return serverIdentity === clientIdentity
}

const cloneOf = (vnode: VNode, elm: Node): VNode => {
  const clone: VNode = {
    sel: vnode.sel,
    data: vnode.data?.is === undefined ? {} : { is: vnode.data.is },
    children: undefined,
    elm,
    text: undefined,
    key: vnode.key,
  }
  if (vnode.identity !== undefined) {
    clone.identity = vnode.identity
  }
  return clone
}

const isAutonomousCustomElement = (element: Element): boolean =>
  (element.namespaceURI === null || element.namespaceURI === HTML_NAMESPACE) &&
  element.localName.includes('-')

const hasViewOwnedLightDom = (vnode: VNode): boolean =>
  vnode.text !== undefined ||
  (vnode.children !== undefined && vnode.children.length > 0) ||
  hasTrustedInnerHtml(vnode.data?.props)

const shouldRebuildCustomElement = (element: Element, vnode: VNode): boolean =>
  isAutonomousCustomElement(element) && hasViewOwnedLightDom(vnode)

type DeferredInsertHook = Readonly<{
  vnode: VNode
  insert: (vnode: VNode) => void
}>

const collectInsertHooks = (
  vnode: VNode,
  collected: Array<DeferredInsertHook>,
): void => {
  const children = vnode.children
  if (children !== undefined) {
    for (const child of children) {
      if (typeof child !== 'string') {
        collectInsertHooks(child, collected)
      }
    }
  }
  const insert = vnode.data?.hook?.insert
  if (insert !== undefined) {
    collected.push({ vnode, insert })
  }
}

const withoutInsertHooks = <A>(vnode: VNode, body: () => A): A => {
  const deferred: Array<DeferredInsertHook> = []
  collectInsertHooks(vnode, deferred)
  for (const { vnode: deferredVNode } of deferred) {
    const hook = deferredVNode.data?.hook
    if (hook !== undefined) {
      delete hook.insert
    }
  }
  try {
    return body()
  } finally {
    for (const { vnode: deferredVNode, insert } of deferred) {
      const hook = deferredVNode.data?.hook
      if (hook !== undefined) {
        hook.insert = insert
      }
    }
  }
}

// NOTE: removing children from an adopted Custom Element would run their
// disconnected callbacks while the host was still live. Those callbacks can
// synchronously mutate the host after hydration has sampled it. Replace the
// host with a comment first, then let the ordinary differ build the vnode while
// detached and insert it in the same position. Its insert hooks remain deferred
// until the whole hydration tree can fire them in render order.
const replaceHydrationElement = (element: Element, vnode: VNode): VNode => {
  const ownerDocument = element.ownerDocument
  const parent = element.parentNode ?? ownerDocument.createDocumentFragment()
  if (element.parentNode === null) {
    parent.appendChild(element)
  }
  const placeholder = ownerDocument.createComment('')
  parent.replaceChild(placeholder, element)
  return withoutInsertHooks(vnode, () => patch(toVNode(placeholder), vnode))
}

const asVNode = (child: VNode | string): VNode =>
  typeof child === 'string'
    ? {
        sel: undefined,
        data: undefined,
        children: undefined,
        elm: undefined,
        text: child,
        key: undefined,
      }
    : child

const clonePreparedTree = (vnode: VNode): VNode => {
  const elm = vnode.elm
  if (elm === undefined) {
    throw new Error('[foldkit] A prepared hydration vnode has no DOM node.')
  }
  const clone = cloneOf(vnode, elm)
  clone.data = {
    ...clone.data,
    ...(vnode.data?.on === undefined ? {} : { on: vnode.data.on }),
    ...(vnode.data?.props === undefined ? {} : { props: vnode.data.props }),
  }
  clone.text = vnode.text
  const children = vnode.children
  if (children !== undefined) {
    const cloneChildren: Array<VNode> = []
    let domChild = elm.firstChild
    for (const rawChild of children) {
      const child = asVNode(rawChild)
      if (child.elm === undefined) {
        child.elm = domChild ?? undefined
      }
      cloneChildren.push(clonePreparedTree(child))
      domChild = child.elm?.nextSibling ?? null
    }
    clone.children = cloneChildren
  }
  return clone
}

const clearChildren = (element: Element): void => {
  element.textContent = ''
}

type TextAdoption = Readonly<{ adoptedNode: Text; nextDomChild: Node | null }>

const adoptText = (
  element: Element,
  domChild: Node | null,
  text: string,
): Option.Option<TextAdoption> => {
  if (domChild !== null && isText(domChild)) {
    const domText = domChild.data
    if (domText === text) {
      return Option.some({
        adoptedNode: domChild,
        nextDomChild: domChild.nextSibling,
      })
    }
    if (domText.startsWith(text)) {
      domChild.splitText(text.length)
      return Option.some({
        adoptedNode: domChild,
        nextDomChild: domChild.nextSibling,
      })
    }
    return Option.none()
  }
  if (text === '') {
    const emptyTextNode = element.ownerDocument.createTextNode('')
    element.insertBefore(emptyTextNode, domChild)
    return Option.some({ adoptedNode: emptyTextNode, nextDomChild: domChild })
  }
  return Option.none()
}

const adoptElement = (
  element: Element,
  vnode: VNode,
  status: HydrationStatus,
): VNode => {
  if (shouldRebuildCustomElement(element, vnode)) {
    return clonePreparedTree(replaceHydrationElement(element, vnode))
  }
  const clone = cloneOf(vnode, element)
  registerControlledSelectState(element, vnode, status)
  // Strip the hydration markers the serializer stamped: they are internal to the
  // handoff, already verified by the parent's positional walk before this call,
  // and must not remain on the adopted element.
  element.removeAttribute(HYDRATION_KEY_ATTRIBUTE)
  element.removeAttribute(HYDRATION_IDENTITY_ATTRIBUTE)

  // NOTE: an autonomous custom element (an HTML-namespace element whose name
  // carries a hyphen) that upgraded before hydration adds attributes, classes,
  // styles, and light DOM of its own in connectedCallback. The attributes, class
  // tokens, and style properties the vnode does not declare are always preserved
  // (here and in seedAdoptedState). One that declares no content leaves the
  // component's light DOM untouched. A host with view-owned text, children, or
  // trusted innerHTML is rebuilt before reaching this state-seeding path. The
  // two cannot share because hydration cannot distinguish a component node from
  // a matching view node. The test is the name shape, not
  // `customElements.get`: whether the element has upgraded is timing-dependent
  // at hydration (its definition may register after the server DOM parses), so a
  // name test is deterministic. A hyphenated element that never upgrades is
  // treated the same way, which is safe: with no component light DOM,
  // undeclared content leaves an empty element and declared content is rebuilt.
  const isCustomElement = isAutonomousCustomElement(element)
  const finishAdoption = (): VNode => {
    if (!isCustomElement) {
      return clone
    }
    seedAdoptedState(element, vnode, clone, status, true)
    withoutInsertHooks(vnode, () => patch(clone, vnode))
    return clonePreparedTree(vnode)
  }

  // A controlled textarea or output serializes its value as text content.
  // That text is its parsed default state, which the fresh client path now
  // synchronizes as well. Keep the server text outside the vnode child walk;
  // the controlled property owns it and its insert hook reasserts both current
  // and default state after the patch.
  if (
    (element.tagName === 'TEXTAREA' || element.tagName === 'OUTPUT') &&
    vnode.data?.props?.['value'] !== undefined
  ) {
    clone.children = []
    return finishAdoption()
  }

  const authoredInnerHtml = vnode.data?.props?.['innerHTML']
  const hasAuthoredInnerHtml =
    authoredInnerHtml !== undefined && hasTrustedInnerHtml(vnode.data?.props)
  const vnodeChildren = vnode.children
  if (hasAuthoredInnerHtml) {
    // NOTE: the browser normalizes markup as it parses (entity forms, tag
    // case, attribute order), so the served innerHTML string rarely equals
    // the authored one byte for byte. Parsing the authored string through a
    // probe element of the same tag compares the two in normalized form;
    // when they agree the clone carries the authored string, the props
    // module sees no change, and the adopted subtree survives. The probe is
    // created in the element's own namespace: foreign content such as SVG
    // parses with case-preserved names (pathLength, viewBox) that an
    // HTML-context parse would lowercase, false-mismatching every camelCase
    // attribute.
    if (typeof authoredInnerHtml === 'string') {
      const probe = createInertProbe(element)
      writeNativeInnerHtml(probe, authoredInnerHtml)
      const currentInnerHtml = readNativeInnerHtml(element)
      const isEquivalentMarkup = readNativeInnerHtml(probe) === currentInnerHtml
      if (!isEquivalentMarkup) {
        detectMismatch(status)
        writeNativeInnerHtml(element, authoredInnerHtml)
      }
      const props = {
        ...clone.data?.props,
        innerHTML: authoredInnerHtml,
      }
      markTrustedInnerHtml(props, props.innerHTML)
      clone.data = {
        ...clone.data,
        props,
      }
    } else {
      const props = {
        ...clone.data?.props,
        innerHTML: readNativeInnerHtml(element),
      }
      markTrustedInnerHtml(props, props.innerHTML)
      clone.data = {
        ...clone.data,
        props,
      }
    }
    clone.children = []
    return finishAdoption()
  }

  // NOTE: no children (undefined) and an empty child list both mean the view
  // declares no children, so they share the childless path. This is also where
  // a custom element's ownership splits: a childless vnode has no view child to
  // adopt, so the component's light DOM is left untouched, while a vnode with
  // real children (the branch below) owns the light DOM and reconciles it.
  if (vnodeChildren === undefined || vnodeChildren.length === 0) {
    // NOTE: only adopt the text shortcut when the element already holds a
    // single text node. `textContent` flattens across element children, so
    // copying it for an element that carries stray markup would compare equal
    // to the vnode text and leave that markup in place. Leaving `clone.text`
    // undefined makes `patchVnode` overwrite the element's content with the
    // vnode text instead, rebuilding the mismatching shape.
    if (vnode.text !== undefined) {
      if (hasOnlyTextContent(element)) {
        clone.text = element.textContent ?? ''
        if (clone.text !== vnode.text) {
          detectMismatch(status)
        }
      } else {
        detectMismatch(status)
      }
    } else if (!isCustomElement && element.firstChild !== null) {
      // NOTE: a childless vnode (no children or an empty child list, and no
      // text) owns an empty element. Server DOM left under it, an older build's
      // content behind a cache race, would otherwise survive every future
      // render, since patchVnode has nothing to diff it against. Clear it so the
      // empty client tree wins, matching the mismatch branches below. A custom
      // element is exempt: its light DOM is component-owned, not stale server
      // state.
      detectMismatch(status)
      clearChildren(element)
      clone.children = []
    }
    return finishAdoption()
  }

  const cloneChildren: Array<VNode> = []
  let domChild: Node | null = element.firstChild

  for (const rawChild of vnodeChildren) {
    const child = asVNode(rawChild)

    if (child.sel === undefined || child.sel === '') {
      const childText = child.text ?? ''
      const maybeAdoption = adoptText(element, domChild, childText)
      if (Option.isNone(maybeAdoption)) {
        detectMismatch(status)
        if (domChild === null) {
          break
        }
        clearChildren(element)
        clone.children = []
        return finishAdoption()
      }
      const adoption = maybeAdoption.value
      const textClone = cloneOf(child, adoption.adoptedNode)
      textClone.text = childText
      cloneChildren.push(textClone)
      domChild = adoption.nextDomChild
      continue
    }

    if (domChild === null) {
      detectMismatch(status)
      break
    }

    if (child.sel === '!') {
      if (!isComment(domChild)) {
        detectMismatch(status)
        clearChildren(element)
        clone.children = []
        return finishAdoption()
      }
      const commentClone = cloneOf(child, domChild)
      commentClone.text = domChild.data
      cloneChildren.push(commentClone)
      domChild = domChild.nextSibling
      continue
    }

    if (
      !isElement(domChild) ||
      !matchesTag(domChild, child) ||
      !matchesNamespace(domChild, child) ||
      !matchesAdoptionIdentity(domChild, child)
    ) {
      detectMismatch(status)
      clearChildren(element)
      clone.children = []
      return finishAdoption()
    }
    const nextDomChild = domChild.nextSibling
    cloneChildren.push(adoptElement(domChild, child, status))
    domChild = nextDomChild
  }

  while (domChild !== null) {
    detectMismatch(status)
    const nextDomChild: Node | null = domChild.nextSibling
    element.removeChild(domChild)
    domChild = nextDomChild
  }

  clone.children = cloneChildren
  return finishAdoption()
}

// NOTE: structural reconciliation can run Custom Element lifecycle callbacks.
// One replacement may mutate an ancestor or an earlier sibling after that node
// was first visited. Sample retained element state and text or comment data only
// after the entire walk has completed, so the ordinary patch compares the view
// against the final values those synchronous callbacks left behind. Custom
// Element code that changes another subtree's structure is outside this pass;
// components must keep structural DOM writes within their own host.
const resampleAdoptedTree = (
  clone: VNode,
  vnode: VNode,
  status: HydrationStatus,
): void => {
  const elm = clone.elm
  if (elm !== undefined && isElement(elm)) {
    seedAdoptedState(elm, vnode, clone, status, isAutonomousCustomElement(elm))
    if (vnode.text !== undefined) {
      clone.text = hasOnlyTextContent(elm) ? (elm.textContent ?? '') : undefined
    }
  } else if (elm !== undefined && (isText(elm) || isComment(elm))) {
    clone.text = elm.data
  }
  const cloneChildren = clone.children
  const vnodeChildren = vnode.children
  if (cloneChildren === undefined || vnodeChildren === undefined) {
    return
  }
  const vnodeChildrenIterator = vnodeChildren.values()
  for (const rawCloneChild of cloneChildren) {
    const nextVnodeChild = vnodeChildrenIterator.next()
    if (nextVnodeChild.done) {
      return
    }
    resampleAdoptedTree(
      asVNode(rawCloneChild),
      asVNode(nextVnodeChild.value),
      status,
    )
  }
}

// NOTE: hydration cannot let the patch fire its own `insert` hooks. The differ
// queues a hook when it creates a node and flushes the queue when the patch
// ends, which covers a fresh render but not a hydration, where some nodes are
// adopted and never created. Firing the created ones from the queue and the
// adopted ones afterward orders every created node before every adopted one:
// a `<main>` that adopts one child and creates its sibling ran the sibling's
// Mount first and the adopted child's second, the reverse of what a fresh
// render does. A Mount that depends on a sibling being initialized would work
// on a fresh boot and break on a hydrated one.
//
// So the hooks are detached before the patch, which leaves the differ's queue
// empty, and fired afterward in one pass over the whole tree, children first,
// the order the differ creates in. Adopted and created nodes are not
// distinguished, because every node in the new tree has a DOM node by then and
// a fresh render would have fired all of them.
const patchFiringInsertHooksInRenderOrder = (
  adoptedClone: VNode,
  nextVNode: VNode,
): VNode => {
  const deferred: Array<DeferredInsertHook> = []
  collectInsertHooks(nextVNode, deferred)

  for (const { vnode } of deferred) {
    const hook = vnode.data?.hook
    if (hook !== undefined) {
      delete hook.insert
    }
  }

  let patchedVNode: VNode
  try {
    patchedVNode = patch(adoptedClone, nextVNode)
  } finally {
    for (const { vnode, insert } of deferred) {
      const hook = vnode.data?.hook
      if (hook !== undefined) {
        hook.insert = insert
      }
    }
  }

  for (const { vnode, insert } of deferred) {
    insert(vnode)
  }

  return patchedVNode
}

/** Hydrates a server-rendered root element against the first render's vnode
 *  tree. Matching DOM nodes are adopted in place: module hooks attach
 *  listeners and re-assert attrs and props onto the existing elements, and
 *  `insert` hooks (Mounts) fire for adopted nodes in the same children-first
 *  order the differ uses for created ones. A mismatching subtree falls back to
 *  a rebuild through `createElm` at the nearest parent. A Custom Element with
 *  view-owned light DOM is replaced so creation follows the fresh-render
 *  lifecycle. Any root-level mismatch also replaces the root. Development
 *  builds warn when reconciliation is required. Returns the patched vnode to
 *  store as the runtime's current tree. */
// Replace the hydration root with a fresh render of the vnode. snabbdom's
// sameVnode compares tag but not namespace, so patching the root directly
// would reuse a same-tag element even across a namespace change. Patching
// against a comment placed where the root was is never sameVnode with a new
// element, so the differ builds a fresh node in the correct namespace and
// swaps it in.
// A root with no parent gets one. Patching a detached root directly is the same
// reuse this function exists to avoid: snabbdom's sameVnode compares tag alone,
// so a same-tag root is kept along with the DOM state on it and its insert hooks
// never fire, which is how a rejected page could keep its own elements and their
// typed values. A fragment gives the placeholder a parent, so the replacement is
// built and swapped in exactly as it is for an attached root.
const replaceHydrationRoot = (hydrationRoot: Element, vnode: VNode): VNode => {
  const ownerDocument = hydrationRoot.ownerDocument
  const parent =
    hydrationRoot.parentNode ?? ownerDocument.createDocumentFragment()
  if (hydrationRoot.parentNode === null) {
    parent.appendChild(hydrationRoot)
  }
  const placeholder = ownerDocument.createComment('')
  parent.replaceChild(placeholder, hydrationRoot)
  return patch(toVNode(placeholder), vnode)
}

export const __hydrateVNode = (
  hydrationRoot: Element,
  nextVNode: VNode | null,
  seen: Set<object> | undefined,
  buildId: string,
): VNode => {
  const dedupedVNode =
    nextVNode !== null ? dedupeSharedVNodes(nextVNode, seen) : h('!')
  const status: HydrationStatus = {
    isMismatchDetected: false,
    adoptedSignatures: new Map(),
    controlledOptionSelection: new Map(),
    controlledSelectState: new Map(),
  }

  // The build token is checked again here, though the runtime has already
  // refused a mismatch before reading the handoff. This is the last line of
  // defense for a caller reaching the adoption step directly, and it never
  // matches an absent marker: `buildId` is required and non-empty, so a page
  // served before build ids existed cannot pass for one of this build's.
  const servedBuild = hydrationRoot.getAttribute(HYDRATION_BUILD_ATTRIBUTE)
  const isSameBuild = buildId !== '' && servedBuild === buildId
  hydrationRoot.removeAttribute(HYDRATION_BUILD_ATTRIBUTE)

  // The root is checked for logical identity the same way every other adopted
  // element is. A root whose key or view identity disagrees with the served one
  // is a different logical root, so it is rebuilt rather than adopted: adopting
  // it would carry the previous root's DOM state (a typed input's value) into a
  // root the client never rendered there.
  const isRootMismatch =
    !isSameBuild ||
    dedupedVNode.sel === undefined ||
    dedupedVNode.sel === '' ||
    dedupedVNode.sel === '!' ||
    !matchesTag(hydrationRoot, dedupedVNode) ||
    !matchesNamespace(hydrationRoot, dedupedVNode) ||
    !matchesAdoptionIdentity(hydrationRoot, dedupedVNode)
  if (isRootMismatch) {
    detectMismatch(status)
    const patchedVNode = replaceHydrationRoot(hydrationRoot, dedupedVNode)
    reportMismatch(status)
    return patchedVNode
  }
  if (shouldRebuildCustomElement(hydrationRoot, dedupedVNode)) {
    return replaceHydrationRoot(hydrationRoot, dedupedVNode)
  }

  const adoptedClone = adoptElement(hydrationRoot, dedupedVNode, status)
  resampleAdoptedTree(adoptedClone, dedupedVNode, status)
  const patchedVNode = patchFiringInsertHooksInRenderOrder(
    adoptedClone,
    dedupedVNode,
  )
  if (import.meta.hot && !status.isMismatchDetected) {
    for (const [element, { vnode, server }] of status.adoptedSignatures) {
      if (__elementSignature(element, vnode) !== server) {
        detectMismatch(status)
        break
      }
    }
  }
  reportMismatch(status)
  return patchedVNode
}
