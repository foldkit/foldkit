import type { DefaultTreeAdapterMap } from 'parse5'
import {
  html as Parse5Html,
  defaultTreeAdapter,
  parse,
  parseFragment,
} from 'parse5'

import { HYDRATION_BUILD_ATTRIBUTE } from '../../buildToken.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
} from '../../hydrationMarker.js'
import { escapeAttributeValue, escapeText } from './serialize.js'
import {
  type RenderedApplication,
  __assertNoDeclarativeShadowRoot,
  __assertNoDocumentStructureEscape,
  __assertNoLiveBaseElement,
} from './server.js'

const DEFAULT_CONTAINER_ID = 'root'

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

const RENDERED_FRAGMENT_CONTEXT = defaultTreeAdapter.createElement(
  'div',
  Parse5Html.NS.HTML,
  [],
)

// NOTE: assembled by concatenation rather than through String.replace, whose
// replacement string reads `$&` and `` $` `` as patterns. Rendered markup is
// application data and may contain either.
const NEUTRAL_CONTEXT_PREFIX =
  '<!doctype html><html><head><title>x</title></head><body>'
const NEUTRAL_CONTEXT_SUFFIX = '</body></html>'

// NOTE: the template's mutation targets (the container, the <title>, the
// <html> element, and the canonical/og:url head elements) are located by
// parsing the template with a real HTML tokenizer and reading each element's
// source offsets, not by matching regular expressions. A regex cannot model
// the tokenizer's states, so a `>` inside a quoted attribute, a
// canonical-looking or container-looking string inside a <script>, the
// script-data-double-escaped state, and a comment-terminating metadata value
// all let context-blind matching write request or application text into an
// executable JavaScript or unintended markup position. Parsing resolves every
// target to an actual element position; the untouched bytes of the template
// are spliced through verbatim.

type Element = DefaultTreeAdapterMap['element']
type ChildNode = DefaultTreeAdapterMap['childNode']
type Attribute = Readonly<{ name: string; value: string }>
type ParentNode = Readonly<{ childNodes: ReadonlyArray<ChildNode> }>

type Mutation = Readonly<{ start: number; end: number; replacement: string }>

const isElement = (node: ChildNode): node is Element => 'tagName' in node

const collectMatching = (
  root: ParentNode,
  predicate: (element: Element) => boolean,
): ReadonlyArray<Element> => {
  const found: Array<Element> = []
  const walk = (node: ParentNode): void => {
    for (const child of node.childNodes) {
      if (isElement(child)) {
        if (predicate(child)) {
          found.push(child)
        }
        walk(child)
      }
    }
  }
  walk(root)
  return found
}

const collectMatchingIncludingTemplateContent = (
  root: ParentNode,
  predicate: (element: Element) => boolean,
): ReadonlyArray<Element> => {
  const found: Array<Element> = []
  const walk = (node: ParentNode): void => {
    for (const child of node.childNodes) {
      if (!isElement(child)) {
        continue
      }
      if (predicate(child)) {
        found.push(child)
      }
      walk(child)
      if (child.tagName === 'template' && 'content' in child) {
        walk(child.content)
      }
    }
  }
  walk(root)
  return found
}

const firstMatching = (
  root: ParentNode,
  predicate: (element: Element) => boolean,
): Element | undefined => collectMatching(root, predicate)[0]

const attributeValue = (element: Element, name: string): string | undefined =>
  element.attrs.find(attribute => attribute.name === name)?.value

// The path from an element to the document as (tag name, index among element
// siblings) steps, innermost first. Tag names alone cannot say which of two
// sibling `<div>`s held the placeholder, and the index is what lets the same
// position be found again in the finished page.
type PathStep = Readonly<{ tagName: string; index: number }>

const elementChildren = (
  node: Readonly<{ childNodes: ReadonlyArray<ChildNode> }>,
): ReadonlyArray<Element> => node.childNodes.filter(isElement)

const parentOf = (element: Element): Element | undefined => {
  const parent = element.parentNode
  return parent !== null && 'tagName' in parent ? parent : undefined
}

// Each step names the element itself and where it sits among its parent's
// element children, outermost last.
const ancestorPath = (element: Element): ReadonlyArray<PathStep> => {
  const path: Array<PathStep> = []
  let current: Element | undefined = element
  while (current !== undefined) {
    const parent = parentOf(current)
    path.push({
      tagName: current.tagName.toLowerCase(),
      index:
        parent === undefined ? 0 : elementChildren(parent).indexOf(current),
    })
    if (parent === undefined) {
      break
    }
    current = parent
  }
  return path
}

// Each step is resolved by the index it recorded, not by the first element that
// happens to carry the tag name. Two sibling `<section>`s are an ordinary
// template, and taking the first would both reject the valid one and let an
// earlier same-tag sibling stand in for the position the placeholder actually
// held, so a corrupted injection could be validated against an intact copy.
const elementAtPath = (
  document: ParentNode,
  path: ReadonlyArray<PathStep>,
): Element | undefined => {
  let node: Element | undefined
  let children = elementChildren(document)
  for (const step of [...path].reverse()) {
    const child = children[step.index]
    if (
      child === undefined ||
      child.tagName.toLowerCase() !== step.tagName ||
      (node !== undefined && child.namespaceURI !== node.namespaceURI)
    ) {
      return undefined
    }
    node = child
    children = elementChildren(child)
  }
  return node
}

// A structural description of a subtree, used to compare what the rendered
// markup describes on its own with what the finished page describes in the
// place the placeholder held. Attributes are sorted so a parser that reorders
// them does not read as a difference, and text runs are merged because adjacent
// text serializes back to one node.
type Shape =
  | Readonly<{
      kind: 'Element'
      tagName: string
      namespace: string
      attributes: ReadonlyArray<readonly [string, string]>
      children: ReadonlyArray<Shape>
    }>
  | Readonly<{ kind: 'Text'; text: string }>
  | Readonly<{ kind: 'Comment'; text: string }>

const shapeOfElement = (element: Element): Shape => ({
  kind: 'Element',
  tagName: element.tagName.toLowerCase(),
  namespace: element.namespaceURI,
  attributes: [...element.attrs]
    .map(attribute => [attribute.name, attribute.value] as const)
    .sort(([left], [right]) => left.localeCompare(right)),
  children: shapesOf(element),
})

const shapesOf = (
  node: Readonly<{ childNodes: ReadonlyArray<ChildNode> }>,
): ReadonlyArray<Shape> => {
  const shapes: Array<Shape> = []
  let text = ''
  const flush = (): void => {
    if (text !== '') {
      shapes.push({ kind: 'Text', text })
    }
    text = ''
  }
  for (const child of node.childNodes) {
    if (isElement(child)) {
      flush()
      shapes.push(shapeOfElement(child))
    } else if (child.nodeName === '#text' && 'value' in child) {
      text += child.value
    } else if (child.nodeName === '#comment' && 'data' in child) {
      flush()
      shapes.push({ kind: 'Comment', text: child.data })
    }
  }
  flush()
  return shapes
}

const isSameShape = (left: Shape, right: Shape): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

// The insertion contexts this API supports, stated rather than inferred. A
// placeholder reached from `<body>` through nothing but flow containers parses
// the same way a body does, which is the context `renderToString` already
// validated the rendered markup against. Every other context (a `<form>`, a
// `<table>`, a `<select>`, foreign content, template content) makes the final
// parse depend on where the markup landed, and is refused with a clear error
// rather than modeled.
const NEUTRAL_ANCESTOR_TAGS: ReadonlySet<string> = new Set([
  'article',
  'aside',
  'body',
  'div',
  'footer',
  'header',
  'main',
  'section',
])

const assertNeutralInsertionContext = (
  container: Element,
  containerId: string,
): void => {
  let current = parentOf(container)
  while (current !== undefined) {
    const tagName = current.tagName.toLowerCase()
    if (tagName === 'html') {
      return
    }
    if (
      !NEUTRAL_ANCESTOR_TAGS.has(tagName) ||
      current.namespaceURI !== HTML_NAMESPACE
    ) {
      throw new Error(
        `[foldkit] injectIntoTemplate found the <div id="${containerId}"></div> placeholder inside <${tagName}>, which is not a supported insertion context. ` +
          'HTML parsing rearranges what an element with a restrictive content ' +
          'model may hold, so the rendered application could be moved, dropped, ' +
          'or reshaped once it sat there. Place the placeholder in the body or ' +
          'inside plain flow containers (div, main, section, article, aside, ' +
          'header, footer).',
      )
    }
    current = parentOf(current)
  }
}

// Declarative shadow DOM is refused by `renderToString` itself, which is where
// every rendered page passes through. The same check runs here as well, since
// `injectIntoTemplate` accepts any `RenderedApplication` a caller hands it,
// including one this process did not produce.

// The rendered markup describes a subtree. Whether the finished page still
// describes it depends on where the placeholder sat: HTML parsing drops a
// `<form>` nested in another `<form>`, foster-parents a `<div>` out of a
// `<table>`, and empties a `<select>` of anything that is not an option. The
// splice itself is always correct, so the only way to see any of that is to
// parse the finished page and compare.
//
// The comparison is of the placeholder's whole parent, not of the root alone.
// What the template says that parent should hold after injection is its own
// children with the placeholder replaced by what the rendered markup describes
// on its own, in the neutral context `renderToString` already validated it
// against. Comparing the whole parent covers the rendered subtree, the nodes
// around it, and the boundaries between them, and it identifies the injection by
// the position its placeholder held rather than by any attribute, so a marker
// authored inside the markup cannot stand in for a root the parser dropped, and
// another application's root elsewhere in the document is not counted against
// this one.
//
// Both parses run with scripting enabled and disabled, because a `<noscript>`
// in the rendered markup changes the tree for exactly the visitors it targets.

const renderedShapes = (
  renderedHtml: string,
  isScriptingEnabled: boolean,
): ReadonlyArray<Shape> => {
  const neutral = parse(
    `${NEUTRAL_CONTEXT_PREFIX}${renderedHtml}${NEUTRAL_CONTEXT_SUFFIX}`,
    { scriptingEnabled: isScriptingEnabled },
  )
  const body = firstMatching(neutral, element => element.tagName === 'body')
  return body === undefined ? [] : shapesOf(body)
}

// Adjacent text runs merge, because a parser reads back-to-back text as one
// node however it was written. Splicing the rendered shapes into the template's
// own children can put text beside text, so the result is merged the same way
// before it is compared.
const mergeAdjacentText = (
  shapes: ReadonlyArray<Shape>,
): ReadonlyArray<Shape> => {
  const merged: Array<Shape> = []
  for (const shape of shapes) {
    const previous = merged[merged.length - 1]
    if (shape.kind === 'Text' && previous?.kind === 'Text') {
      merged[merged.length - 1] = {
        kind: 'Text',
        text: previous.text + shape.text,
      }
      continue
    }
    merged.push(shape)
  }
  return merged.filter(shape => shape.kind !== 'Text' || shape.text !== '')
}

// The shapes of a node's children, plus where in that list a given child lands.
const shapesAround = (
  parent: Element,
  child: Element,
): Readonly<{ shapes: ReadonlyArray<Shape>; index: number }> => {
  const shapes = shapesOf(parent)
  let index = 0
  let isTextOpen = false
  for (const candidate of parent.childNodes) {
    if (isElement(candidate)) {
      if (candidate === child) {
        return { shapes, index }
      }
      isTextOpen = false
      index += 1
    } else if (candidate.nodeName === '#text' && 'value' in candidate) {
      if (!isTextOpen && candidate.value !== '') {
        isTextOpen = true
        index += 1
      }
    } else if (candidate.nodeName === '#comment') {
      isTextOpen = false
      index += 1
    }
  }
  return { shapes, index }
}

const assertInjectionIsFaithful = (
  page: string,
  template: string,
  renderedHtml: string,
  containerId: string,
  isScriptingEnabled: boolean,
): void => {
  const parsedTemplate = parse(template, {
    scriptingEnabled: isScriptingEnabled,
  })
  const container = firstMatching(parsedTemplate, element =>
    isContainerPlaceholder(element, containerId),
  )
  const containerParent =
    container === undefined ? undefined : parentOf(container)
  if (container === undefined || containerParent === undefined) {
    // The placeholder does not survive this parser mode at all, so whatever
    // replaced it does not either: markup before it swallowed the rest of the
    // shell. Losing the application root for the visitors of one mode is the
    // failure this check exists to catch, not a reason to skip it.
    throw new Error(
      `[foldkit] The <div id="${containerId}"></div> placeholder does not survive when a browser parses the template with scripting ${isScriptingEnabled ? 'enabled' : 'disabled'}. ` +
        'Markup before it leaves an element open (an unterminated <textarea>, ' +
        '<style>, or comment inside a <noscript> fallback), so the application ' +
        'root and the rest of the shell are swallowed as its content. Ensure ' +
        'the template is complete and balanced in both parser modes.',
    )
  }

  const { shapes: templateShapes, index } = shapesAround(
    containerParent,
    container,
  )
  const expected = mergeAdjacentText([
    ...templateShapes.slice(0, index),
    ...renderedShapes(renderedHtml, isScriptingEnabled),
    ...templateShapes.slice(index + 1),
  ])

  const parsedPage = parse(page, { scriptingEnabled: isScriptingEnabled })
  const pageParent = elementAtPath(parsedPage, ancestorPath(containerParent))
  const actual =
    pageParent === undefined ? [] : mergeAdjacentText(shapesOf(pageParent))

  const isFaithful =
    expected.length === actual.length &&
    expected.every((shape, offset) => {
      const candidate = actual[offset]
      return candidate !== undefined && isSameShape(shape, candidate)
    })

  if (!isFaithful) {
    throw new Error(
      `[foldkit] injectIntoTemplate produced a page that no longer describes the rendered markup${isScriptingEnabled ? '' : ' when a browser parses it with scripting disabled'}. ` +
        'HTML parsing moved, dropped, or reshaped the rendered nodes once they ' +
        `sat where the <div id="${containerId}"></div> placeholder was, which ` +
        'happens when the placeholder is nested inside an element with a ' +
        'restrictive content model (a <form> inside another <form>, anything ' +
        'inside a <table> or <select>, or foreign content such as <svg> or ' +
        '<math>). Move the placeholder to the body or another neutral container.',
    )
  }
}

const withAttribute = (
  attributes: ReadonlyArray<Attribute>,
  name: string,
  value: string,
): ReadonlyArray<Attribute> => {
  const exists = attributes.some(attribute => attribute.name === name)
  if (exists) {
    return attributes.map(attribute =>
      attribute.name === name ? { name, value } : attribute,
    )
  }
  return [...attributes, { name, value }]
}

const renderAttributes = (attributes: ReadonlyArray<Attribute>): string =>
  attributes
    .map(
      attribute =>
        ` ${attribute.name}="${escapeAttributeValue(attribute.value)}"`,
    )
    .join('')

const renderStartTag = (
  tagName: string,
  attributes: ReadonlyArray<Attribute>,
): string => `<${tagName}${renderAttributes(attributes)}>`

const renderVoidElement = (
  tagName: string,
  attributes: ReadonlyArray<Attribute>,
): string => `<${tagName}${renderAttributes(attributes)} />`

const applyMutations = (
  template: string,
  mutations: ReadonlyArray<Mutation>,
): string => {
  const ordered = [...mutations].sort((left, right) => right.start - left.start)
  let result = template
  for (const mutation of ordered) {
    result =
      result.slice(0, mutation.start) +
      mutation.replacement +
      result.slice(mutation.end)
  }
  return result
}

// A valid container is `<div id="{containerId}"></div>` with no other
// attributes and no children, so the rendered application replaces the exact
// placeholder and nothing else.
const ASCII_WHITESPACE_ONLY = /^[ \t\n\f\r]*$/

const isIgnorableTopLevelText = (node: ChildNode): boolean =>
  node.nodeName === '#text' &&
  'value' in node &&
  ASCII_WHITESPACE_ONLY.test(node.value)

const sourceLocationOf = (
  node: ChildNode,
): Readonly<{ startOffset: number; endOffset: number }> | undefined => {
  if (!('sourceCodeLocation' in node)) {
    return undefined
  }
  const location = node.sourceCodeLocation
  return location === null || location === undefined ? undefined : location
}

const hasGeneratedDescendant = (node: ParentNode): boolean => {
  for (const child of node.childNodes) {
    if (sourceLocationOf(child) === undefined) {
      return true
    }
    if (isElement(child)) {
      if (hasGeneratedDescendant(child)) {
        return true
      }
      if (
        child.tagName === 'template' &&
        'content' in child &&
        hasGeneratedDescendant(child.content)
      ) {
        return true
      }
    }
  }
  return false
}

const assertRenderedSourceIsPreserved = (
  renderedHtml: string,
  parsed: ParentNode,
): void => {
  let endOffset = 0
  for (const child of parsed.childNodes) {
    const location = sourceLocationOf(child)
    if (location === undefined || location.startOffset < endOffset) {
      throw new Error(
        '[foldkit] injectIntoTemplate received rendered markup that a browser ' +
          'reshapes before insertion. The rendered application must be one ' +
          'complete parser-stable root, with only its optional Flags payload ' +
          'beside it.',
      )
    }
    if (
      !ASCII_WHITESPACE_ONLY.test(
        renderedHtml.slice(endOffset, location.startOffset),
      )
    ) {
      throw new Error(
        '[foldkit] injectIntoTemplate received rendered markup whose source ' +
          'does not survive parsing. An element was dropped, moved, or split ' +
          'before the application reached the template.',
      )
    }
    endOffset = location.endOffset
  }
  if (!ASCII_WHITESPACE_ONLY.test(renderedHtml.slice(endOffset))) {
    throw new Error(
      '[foldkit] injectIntoTemplate received rendered markup whose trailing ' +
        'source does not survive parsing. An element was dropped, moved, or ' +
        'split before the application reached the template.',
    )
  }
  if (hasGeneratedDescendant(parsed)) {
    throw new Error(
      '[foldkit] injectIntoTemplate received rendered markup that makes the ' +
        'HTML parser insert or reconstruct nodes. Pass the unchanged output ' +
        'of renderToString rather than hand-authored or parser-unstable markup.',
    )
  }
}

// The runtime id the rendered markup stamps on its root, or `undefined` when it
// carries no stamp (a render that nothing will hydrate).
const runtimeIdInMode = (
  renderedHtml: string,
  isScriptingEnabled: boolean,
): string | undefined => {
  const parsed = parseFragment(RENDERED_FRAGMENT_CONTEXT, renderedHtml, {
    scriptingEnabled: isScriptingEnabled,
    sourceCodeLocationInfo: true,
  })
  assertRenderedSourceIsPreserved(renderedHtml, parsed)
  const applicationMarkers = collectMatchingIncludingTemplateContent(
    parsed,
    element => attributeValue(element, FOLDKIT_APP_ATTRIBUTE) !== undefined,
  )
  const flagsMarkers = collectMatchingIncludingTemplateContent(
    parsed,
    element => attributeValue(element, FOLDKIT_FLAGS_ATTRIBUTE) !== undefined,
  )
  const buildMarkers = collectMatchingIncludingTemplateContent(
    parsed,
    element => attributeValue(element, HYDRATION_BUILD_ATTRIBUTE) !== undefined,
  )
  if (applicationMarkers.length === 0 && flagsMarkers.length === 0) {
    if (buildMarkers.length > 0) {
      throw new Error(
        '[foldkit] injectIntoTemplate received a build marker without a ' +
          'matching server-rendered application root.',
      )
    }
    const significant = parsed.childNodes.filter(
      node => !isIgnorableTopLevelText(node),
    )
    if (significant.length > 1) {
      throw new Error(
        '[foldkit] injectIntoTemplate received static rendered markup with ' +
          'more than one top-level node. renderToString produces one static ' +
          'root, one text or comment root, or no body output.',
      )
    }
    return undefined
  }
  const root = applicationMarkers.at(0)
  const runtimeId =
    root === undefined ? undefined : attributeValue(root, FOLDKIT_APP_ATTRIBUTE)
  const isTopLevelRoot =
    root !== undefined && parsed.childNodes.some(node => node === root)
  const areFlagsTopLevel = flagsMarkers.every(element =>
    parsed.childNodes.some(node => node === element),
  )
  const isFlagsPairValid = flagsMarkers.every(
    element =>
      element.tagName === 'script' &&
      attributeValue(element, 'type') === 'application/json' &&
      attributeValue(element, FOLDKIT_FLAGS_ATTRIBUTE) === runtimeId,
  )
  const buildId =
    root === undefined
      ? undefined
      : attributeValue(root, HYDRATION_BUILD_ATTRIBUTE)
  const isBuildPairValid =
    buildId !== undefined &&
    buildId !== '' &&
    buildMarkers.length === 1 &&
    buildMarkers.at(0) === root
  const significant = parsed.childNodes.filter(
    node => !isIgnorableTopLevelText(node),
  )
  const hasOnlyOwnedTopLevelNodes = significant.every(
    node => node === root || (isElement(node) && flagsMarkers.includes(node)),
  )
  if (
    runtimeId === undefined ||
    runtimeId === '' ||
    applicationMarkers.length !== 1 ||
    !isTopLevelRoot ||
    flagsMarkers.length > 1 ||
    !areFlagsTopLevel ||
    !isFlagsPairValid ||
    !isBuildPairValid ||
    !hasOnlyOwnedTopLevelNodes ||
    significant.length !== 1 + flagsMarkers.length
  ) {
    throw new Error(
      '[foldkit] injectIntoTemplate received rendered markup with ambiguous ' +
        'Foldkit root or Flags markers. A rendered application must carry ' +
        'exactly one top-level data-foldkit-app root with a nonempty ' +
        'data-foldkit-build marker, at most one matching top-level ' +
        'script[type="application/json"][data-foldkit-flags] payload, and no ' +
        'other top-level content. Application content cannot author any of ' +
        'those markers.',
    )
  }
  return runtimeId
}

const runtimeIdOf = (renderedHtml: string): string | undefined => {
  const enabled = runtimeIdInMode(renderedHtml, true)
  const disabled = runtimeIdInMode(renderedHtml, false)
  if (enabled !== disabled) {
    throw new Error(
      '[foldkit] injectIntoTemplate received rendered markup whose root and ' +
        'Flags ownership changes when scripting is disabled.',
    )
  }
  return enabled
}

const isContainerPlaceholder = (
  element: Element,
  containerId: string,
): boolean =>
  element.tagName === 'div' &&
  element.attrs.length === 1 &&
  element.attrs[0]?.name === 'id' &&
  element.attrs[0]?.value === containerId &&
  element.childNodes.length === 0

/** Options for {@link injectIntoTemplate}.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type InjectIntoTemplateOptions = Readonly<{
  /** The `id` of the exact `<div id="..."></div>` placeholder the rendered
   *  markup replaces. Defaults to `'root'`. */
  containerId?: string
}>

/**
 * Places a rendered page into an HTML template.
 *
 * The rendered markup (root element plus the flags payload script) replaces
 * the empty container element, so the booting runtime finds the root by its
 * `data-foldkit-app` stamp and hydrates in place. The `Document` head fields
 * are stamped into the shell so the served HTML is correct before the runtime
 * boots: `title` replaces the `<title>` text, `lang` and `dir` are set on the
 * `<html>` element, `canonical` replaces the `href` of a
 * `<link rel="canonical">` element, and `ogUrl` replaces the `content` of a
 * `<meta property="og:url">` element. A field the render omits, or a head
 * element the template does not carry, leaves the template untouched at that
 * spot.
 *
 * The template is parsed with an HTML tokenizer, so every mutation targets a
 * real element rather than a byte pattern. The container contract is
 * deliberately exact: the template must contain one `<div id="root"></div>`
 * placeholder, or the equivalent for `containerId`, with no additional
 * attributes and no content. It must also contain exactly one `<title>`
 * element in its head. Throws when either required location is missing or
 * appears more than once.
 *
 * Pass the `RenderedApplication` returned by `renderToString` unchanged. A
 * hydratable value must parse as exactly one top-level element carrying one
 * nonempty root stamp and build stamp, optionally followed by one matching
 * top-level JSON Flags script. Static output may contain one element, text, or
 * comment root, or no body output. The helper rejects additional top-level
 * content, ambiguous handoff markers, and source that the HTML parser drops,
 * splits, moves, or reconstructs before insertion. It also refuses to place a
 * hydratable application in a template that already contains one. Static body
 * output may be inserted beside a hydratable application because no runtime
 * adopts it. Each insertion still applies that render's `Document` head
 * fields.
 *
 * This helper is pure with no module state, so a host process may import it
 * directly even when the render itself must stay inside the server entry's
 * module graph.
 *
 * @example
 * ```typescript
 * const page = injectIntoTemplate(template, rendered)
 * ```
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const injectIntoTemplate = (
  template: string,
  rendered: RenderedApplication,
  options?: InjectIntoTemplateOptions,
): string => {
  const containerId = options?.containerId ?? DEFAULT_CONTAINER_ID
  const document = parse(template, { sourceCodeLocationInfo: true })

  const containers = collectMatching(document, element =>
    isContainerPlaceholder(element, containerId),
  )
  if (containers.length === 0) {
    throw new Error(
      `[foldkit] injectIntoTemplate found no exact <div id="${containerId}"></div> placeholder in the template. ` +
        'Add that markup where the application root belongs, or pass the container id the template uses.',
    )
  }
  if (containers.length > 1) {
    throw new Error(
      `[foldkit] injectIntoTemplate found more than one <div id="${containerId}"></div> placeholder in the template. ` +
        'Keep exactly one placeholder with that id.',
    )
  }

  // The runtime id names an application across the whole page: it pairs a root
  // with its Flags payload, and it keys the Model and scroll position HMR
  // preserves. Two roots sharing one is not a second application, it is the
  // same application claimed twice, so the second injection is refused rather
  // than producing a page whose parts silently take each other's state. This
  // holds whether or not either application declares Flags.
  //
  // Distinct ids are not a licence to hydrate two applications on one page.
  // Each page-owning application rewrites the document's metadata and installs
  // its own navigation listeners, which no id divides between them.
  const renderedRuntimeId = runtimeIdOf(rendered.html)
  if (renderedRuntimeId !== undefined) {
    const existing = collectMatching(
      document,
      element =>
        attributeValue(element, FOLDKIT_APP_ATTRIBUTE) === renderedRuntimeId,
    )
    if (existing.length > 0) {
      throw new Error(
        `[foldkit] injectIntoTemplate is placing an application stamped ` +
          `"${renderedRuntimeId}", but the page already holds a root with ` +
          'that id. A runtime id names one application for the whole page: it ' +
          'pairs a root with its Flags payload and keys the Model and scroll ' +
          'position hot reloading preserves, so two roots sharing one would ' +
          "take each other's state. Remove the duplicate root. Foldkit " +
          'supports one page-owning hydratable application per document.',
      )
    }
    const existingApplications = collectMatching(
      document,
      element => attributeValue(element, FOLDKIT_APP_ATTRIBUTE) !== undefined,
    )
    if (existingApplications.length > 0) {
      throw new Error(
        '[foldkit] injectIntoTemplate is placing a hydratable application, ' +
          'but the page already holds a server-rendered application. Foldkit ' +
          'supports one page-owning application per document because each ' +
          'application owns the document metadata and installs document-wide ' +
          'navigation listeners. Render one application per page.',
      )
    }
    const existingFlags = collectMatching(
      document,
      element =>
        attributeValue(element, FOLDKIT_FLAGS_ATTRIBUTE) === renderedRuntimeId,
    )
    if (existingFlags.length > 0) {
      throw new Error(
        `[foldkit] injectIntoTemplate is placing an application stamped ` +
          `"${renderedRuntimeId}", but the page already holds a Flags ` +
          'payload with that id. A runtime id pairs exactly one root with at ' +
          'most one generated payload, so a stale or application-authored ' +
          'marker would make hydration ambiguous. Remove the conflicting ' +
          'script[data-foldkit-flags].',
      )
    }
  }

  const idMatches = collectMatching(
    document,
    element => attributeValue(element, 'id') === containerId,
  )
  if (idMatches.length > 1) {
    throw new Error(
      `[foldkit] injectIntoTemplate found more than one element with id="${containerId}" in the template. ` +
        'The runtime finds the application root by this id once the placeholder is replaced, so a second element sharing it would resolve to the wrong element. Keep the id unique to the placeholder.',
    )
  }

  const head = firstMatching(document, element => element.tagName === 'head')
  const titles =
    head === undefined
      ? []
      : collectMatching(head, element => element.tagName === 'title')
  if (titles.length === 0) {
    throw new Error(
      '[foldkit] injectIntoTemplate found no <title> element in the template head. ' +
        'Add exactly one <title> where the rendered Document title belongs.',
    )
  }
  if (titles.length > 1) {
    throw new Error(
      '[foldkit] injectIntoTemplate found more than one <title> element in the template head. ' +
        'Keep exactly one title for the rendered Document.',
    )
  }

  const mutations: Array<Mutation> = []

  const container = containers[0]!
  assertNeutralInsertionContext(container, containerId)
  __assertNoDeclarativeShadowRoot(rendered.html)
  __assertNoDocumentStructureEscape(rendered.html)
  __assertNoLiveBaseElement(rendered.html)
  const containerLocation = container.sourceCodeLocation
  if (containerLocation != null) {
    mutations.push({
      start: containerLocation.startOffset,
      end: containerLocation.endOffset,
      replacement: rendered.html,
    })
  }

  const title = titles[0]!
  const titleLocation = title.sourceCodeLocation
  if (titleLocation?.startTag != null && titleLocation.endTag != null) {
    mutations.push({
      start: titleLocation.startTag.endOffset,
      end: titleLocation.endTag.startOffset,
      replacement: escapeText(rendered.title),
    })
  }

  const html = firstMatching(document, element => element.tagName === 'html')
  if (rendered.lang !== undefined || rendered.dir !== undefined) {
    // HTML lets the <html> start tag be omitted, in which case parse5 builds an
    // implicit html element with no start-tag location to mutate. Rather than
    // silently drop the language or direction the page requested, fail so the
    // author adds an explicit tag.
    const startTag = html?.sourceCodeLocation?.startTag
    if (html === undefined || startTag == null) {
      throw new Error(
        '[foldkit] injectIntoTemplate cannot stamp the language or direction ' +
          'because the template has no explicit <html> start tag to mutate. ' +
          'Add an <html> tag to the template so lang and dir can be set.',
      )
    }
    let attributes: ReadonlyArray<Attribute> = html.attrs
    if (rendered.lang !== undefined) {
      attributes = withAttribute(attributes, 'lang', rendered.lang)
    }
    if (rendered.dir !== undefined) {
      attributes = withAttribute(attributes, 'dir', rendered.dir)
    }
    mutations.push({
      start: startTag.startOffset,
      end: startTag.endOffset,
      replacement: renderStartTag('html', attributes),
    })
  }

  if (rendered.canonical !== undefined && head !== undefined) {
    const canonical = firstMatching(
      head,
      element =>
        element.tagName === 'link' &&
        attributeValue(element, 'rel')?.toLowerCase() === 'canonical',
    )
    if (canonical?.sourceCodeLocation != null) {
      mutations.push({
        start: canonical.sourceCodeLocation.startOffset,
        end: canonical.sourceCodeLocation.endOffset,
        replacement: renderVoidElement(
          'link',
          withAttribute(canonical.attrs, 'href', rendered.canonical),
        ),
      })
    }
  }

  if (rendered.ogUrl !== undefined && head !== undefined) {
    const ogUrl = firstMatching(
      head,
      element =>
        element.tagName === 'meta' &&
        attributeValue(element, 'property')?.toLowerCase() === 'og:url',
    )
    if (ogUrl?.sourceCodeLocation != null) {
      mutations.push({
        start: ogUrl.sourceCodeLocation.startOffset,
        end: ogUrl.sourceCodeLocation.endOffset,
        replacement: renderVoidElement(
          'meta',
          withAttribute(ogUrl.attrs, 'content', rendered.ogUrl),
        ),
      })
    }
  }

  const page = applyMutations(template, mutations)

  // Checked for every render, hydratable or not. Static markup is placed into a
  // document the same way, and markup the parser drops is lost with no
  // hydration to rebuild it.
  for (const isScriptingEnabled of [true, false]) {
    assertInjectionIsFaithful(
      page,
      template,
      rendered.html,
      containerId,
      isScriptingEnabled,
    )
  }

  return page
}
