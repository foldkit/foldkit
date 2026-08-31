import {
  Array,
  Context,
  Data,
  Effect,
  Option,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import type { DefaultTreeAdapterMap } from 'parse5'
import {
  html as Parse5Html,
  defaultTreeAdapter,
  parse,
  parseFragment,
} from 'parse5'

import { HYDRATION_BUILD_ATTRIBUTE } from '../../buildToken.js'
import {
  MATHML_NAMESPACE,
  SVG_NAMESPACE,
  parsedAttributeName,
} from '../../domReflection.js'
import {
  beginRender,
  createBoundaryRegistry,
  drainPatchOutlines,
} from '../../html/boundary.js'
import {
  type Document,
  type HtmlBuilder,
  __htmlBuilder as htmlBuilderFor,
  textDirectionToAttribute,
} from '../../html/index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from '../../html/runtimeSingleton.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
} from '../../hydrationMarker.js'
import {
  HYDRATION_IDENTITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
} from '../../hydrationMarkers.js'
import { hasTrustedInnerHtml } from '../../propertyProvenance.js'
import type { VNode } from '../../snabbdom/vnode.js'
import { tagNameFromSelector } from '../../tagName.js'
import type { Return as UpdateReturn } from '../../update/index.js'
import { Url, fromString } from '../../url/index.js'
import {
  controlledValueContent,
  escapeAttributeValue,
  serializeHtml,
} from './serialize.js'

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

type Parse5ChildNode = DefaultTreeAdapterMap['childNode']
type Parse5Element = DefaultTreeAdapterMap['element']

const isParse5Element = (node: Parse5ChildNode): node is Parse5Element =>
  'tagName' in node

// Only ASCII whitespace is inter-element whitespace an HTML parser may add or
// drop without changing meaning. Trimming with String.prototype.trim would also
// treat a non-breaking space or other Unicode whitespace as ignorable, letting
// a visible text node the parser foster-parented out of the root (a stray
// ` ` a <table> spills before itself) slip past the single-root guard.
const ASCII_WHITESPACE_ONLY = /^[ \t\n\f\r]*$/
const isIgnorableText = (node: Parse5ChildNode): boolean =>
  node.nodeName === '#text' &&
  'value' in node &&
  ASCII_WHITESPACE_ONLY.test(node.value)

type VnodeChild =
  | Readonly<{ kind: 'Element'; vnode: VNode }>
  | Readonly<{ kind: 'Text'; text: string }>
  | Readonly<{ kind: 'Comment'; text: string }>

type ParsedChild =
  | Readonly<{ kind: 'Element'; element: Parse5Element }>
  | Readonly<{ kind: 'Text'; text: string }>
  | Readonly<{ kind: 'Comment'; text: string }>

// The children a vnode declares, with consecutive text merged into one run.
// The serializer emits adjacent text children back to back, so the parser
// reads them as a single text node; merging both sides makes them comparable.
// A zero-length run is dropped: the serializer emits no node for empty text,
// so the parser produces none either.
const normalizeVnodeChildren = (vnode: VNode): ReadonlyArray<VnodeChild> => {
  const children = vnode.children
  if (children === undefined) {
    return []
  }
  const items: globalThis.Array<VnodeChild> = []
  let text = ''
  const flush = (): void => {
    if (text !== '') {
      items.push({ kind: 'Text', text })
    }
    text = ''
  }
  for (const child of children) {
    if (typeof child === 'string') {
      text += child
      continue
    }
    const selector = child.sel
    if (selector === undefined || selector === '') {
      text += child.text ?? ''
    } else if (selector === '!') {
      flush()
      items.push({ kind: 'Comment', text: child.text ?? '' })
    } else {
      flush()
      items.push({ kind: 'Element', vnode: child })
    }
  }
  flush()
  return items
}

const normalizeParsedChildren = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): ReadonlyArray<ParsedChild> => {
  const items: globalThis.Array<ParsedChild> = []
  let text = ''
  const flush = (): void => {
    if (text !== '') {
      items.push({ kind: 'Text', text })
    }
    text = ''
  }
  for (const child of node.childNodes) {
    if (isParse5Element(child)) {
      flush()
      items.push({ kind: 'Element', element: child })
    } else if (child.nodeName === '#text' && 'value' in child) {
      text += child.value
    } else if (child.nodeName === '#comment' && 'data' in child) {
      flush()
      items.push({ kind: 'Comment', text: child.data })
    }
  }
  flush()
  return items
}

// The children a controlled `<textarea>` or `<output>` serializes to. Both emit
// their `value` prop as text content (for a textarea the serializer's
// leading-newline padding and the parser's leading-newline strip cancel, so the
// parsed text is the value verbatim), which the walk represents as a single text
// run, empty value omitted. An uncontrolled element serializes its own children,
// so they are validated normally, rejecting element children the parser folds
// into text.
const expectedControlledChildren = (
  vnode: VNode,
): ReadonlyArray<VnodeChild> => {
  const content = controlledValueContent(vnode.data?.props)
  if (content === undefined) {
    return normalizeVnodeChildren(vnode)
  }
  return content === '' ? [] : [{ kind: 'Text', text: content }]
}

// <noscript> and <template> parse their children into a place the differ never
// walks (noscript content is raw text while scripting is enabled; template
// children live in a separate content fragment), so a view that puts elements in
// either can never hydrate. They surface here as an ordinary child-structure
// mismatch, so name the real cause rather than the generic table guidance.
const structureMismatch = (parsed: Parse5Element): Error => {
  const tagName = parsed.tagName.toLowerCase()
  if (tagName === 'noscript') {
    return new Error(
      '[foldkit] <noscript> content cannot be server-rendered as elements. A ' +
        'browser parses <noscript> as raw text while scripting is enabled, so ' +
        'the child elements the view declares arrive as one text node and ' +
        'hydration cannot converge. A <noscript> with plain text works; put ' +
        'richer fallback markup in the HTML shell instead.',
    )
  }
  if (tagName === 'template') {
    return new Error(
      '[foldkit] <template> content cannot be server-rendered. A browser holds ' +
        'template children in a separate content fragment the differ does not ' +
        'walk, so hydration cannot reconcile them. Keep <template> markup in ' +
        'the HTML shell rather than the view.',
    )
  }
  return new Error(
    `[foldkit] HTML parsing changed the child structure inside ` +
      `<${parsed.tagName}>. It inserts, moves, or drops nodes the view did ` +
      'not write (a <tbody> around a bare <tr> in a <table>, text ' +
      'foster-parented out of a <table>), which hydration would rebuild as a ' +
      'mismatch. Write the structure HTML parsing produces, such as explicit ' +
      'table sections.',
  )
}

const expectedParsedTagName = (vnode: VNode): string => {
  const tagName = tagNameFromSelector(vnode.sel ?? '')
  return vnode.data?.ns === undefined ? tagName.toLowerCase() : tagName
}

const foreignTagNameMismatch = (
  parsedTagName: string,
  authoredTagName: string,
): Error =>
  new Error(
    `[foldkit] HTML parsing changed the foreign-content tag ` +
      `<${authoredTagName}> to <${parsedTagName}>. SVG and MathML tag names ` +
      'are case-sensitive when the client creates them. Use the canonical ' +
      'tag spelling so the served and fresh client DOM agree.',
  )

// Compare the child structure the browser parsed against the structure the
// view declared, recursively. The top-level check rejects a root that splits
// into siblings; this rejects a parser correction inside the root, whether an
// inserted element (the `<tbody>` a browser adds around a bare `<tr>`) or
// foster-parented text, which hydration would otherwise see as a whole-subtree
// mismatch.
const assertStructureMatches = (parsed: Parse5Element, vnode: VNode): void => {
  // `h.InnerHTML` owns an opaque, parser-produced subtree that the vnode does
  // not model as children, so it is left unwalked. A property that merely
  // carries the name is not that: the serializer emits the vnode's own children
  // for it, so they are walked like any others.
  if (hasTrustedInnerHtml(vnode.data?.props)) {
    assertInnerHtmlContextMatches(parsed, vnode)
    return
  }
  const parsedChildren = normalizeParsedChildren(parsed)
  const parsedTag = parsed.tagName.toLowerCase()
  const vnodeChildren =
    parsedTag === 'textarea' || parsedTag === 'output'
      ? expectedControlledChildren(vnode)
      : normalizeVnodeChildren(vnode)
  if (parsedChildren.length !== vnodeChildren.length) {
    throw structureMismatch(parsed)
  }
  for (const [parsedChild, vnodeChild] of Array.zip(
    parsedChildren,
    vnodeChildren,
  )) {
    if (parsedChild.kind !== vnodeChild.kind) {
      throw structureMismatch(parsed)
    }
    if (parsedChild.kind === 'Element' && vnodeChild.kind === 'Element') {
      const expectedTag = expectedParsedTagName(vnodeChild.vnode)
      const expectedNamespace =
        typeof vnodeChild.vnode.data?.ns === 'string'
          ? vnodeChild.vnode.data.ns
          : HTML_NAMESPACE
      if (
        expectedNamespace !== HTML_NAMESPACE &&
        parsedChild.element.namespaceURI === expectedNamespace &&
        parsedChild.element.tagName !== expectedTag
      ) {
        throw foreignTagNameMismatch(parsedChild.element.tagName, expectedTag)
      }
      if (
        parsedChild.element.tagName !== expectedTag ||
        parsedChild.element.namespaceURI !== expectedNamespace
      ) {
        throw new Error(
          `[foldkit] HTML parsing produced <${parsedChild.element.tagName}> ` +
            `where the view declared <${expectedTag}> inside ` +
            `<${parsed.tagName}>. The browser inserts or reorders elements (a ` +
            '<tbody> around a bare <tr> in a <table>) that hydration would ' +
            'rebuild as a mismatch. Write the structure HTML parsing produces.',
        )
      }
      assertStructureMatches(parsedChild.element, vnodeChild.vnode)
    } else if (parsedChild.kind === 'Text' && vnodeChild.kind === 'Text') {
      if (parsedChild.text !== vnodeChild.text) {
        throw structureMismatch(parsed)
      }
    } else if (
      parsedChild.kind === 'Comment' &&
      vnodeChild.kind === 'Comment'
    ) {
      if (parsedChild.text !== vnodeChild.text) {
        throw structureMismatch(parsed)
      }
    }
  }
}

// injectIntoTemplate splices the rendered root where <div id="root"></div> was,
// so a browser parses the served markup in a <div> (in body) insertion context.
// parseFragment defaults to a <template> context, whose insertion mode keeps
// table-section tags (<td>, <tr>, <caption>, ...) that an in-body parse
// foster-parents or drops. Reusing a real <div> context node makes this check
// model the true insertion point, so a table-section root is rejected here
// instead of silently escaping the application root on the served page.
const buildDivFragmentContext = (): Parse5Element => {
  const [onlyChild] = parseFragment('<div></div>').childNodes
  if (onlyChild === undefined || !isParse5Element(onlyChild)) {
    throw new Error(
      '[foldkit] internal: could not build the <div> parse context',
    )
  }
  return onlyChild
}
const DIV_FRAGMENT_CONTEXT = buildDivFragmentContext()

// After serialization, confirm the root closes cleanly. An unterminated element
// inside the root (an unclosed `<textarea>`, `<script>`, `<style>`, comment, or
// `<plaintext>`, typically from an incomplete `InnerHTML` fragment) does not end
// at the root's own close tag, so it would swallow the Flags payload, the client
// entry, and everything after the root when the served document is parsed. The
// per-element structure walk skips `InnerHTML` subtrees, so this parses the root
// markup with a trailing sentinel comment and requires the sentinel to survive
// as a top-level sibling: if the root consumed it, so would the rest of the page.
//
// NOTE: the parse runs twice, because `<noscript>` has two parser modes and the
// document has to survive both. With scripting enabled, the state a hydrating
// visitor's browser is in, noscript content is raw text. With scripting
// disabled, the state noscript exists to serve, the same content parses as HTML,
// so an unterminated element inside a noscript fallback swallows the rest of the
// page for exactly the visitors the fallback was written for. Both modes are
// checked, so a fallback that frames cleanly for one visitor cannot break the
// document for the other.
const TRAILING_SENTINEL_DATA = 'foldkit-trailing-boundary'
const TRAILING_SENTINEL = `<!--${TRAILING_SENTINEL_DATA}-->`

const closesCleanly = (html: string, isScriptingEnabled: boolean): boolean => {
  const fragment = parseFragment(
    DIV_FRAGMENT_CONTEXT,
    html + TRAILING_SENTINEL,
    {
      scriptingEnabled: isScriptingEnabled,
    },
  )
  const significant = fragment.childNodes.filter(node => !isIgnorableText(node))
  const last = significant[significant.length - 1]
  return (
    last !== undefined &&
    last.nodeName === '#comment' &&
    'data' in last &&
    last.data === TRAILING_SENTINEL_DATA
  )
}

// Framing is not the only thing `<noscript>` can break. An element the fallback
// leaves open does not have to reach the end of the document to do damage: with
// scripting disabled an unclosed `<form>` or `<table>` stops at the root's close
// tag, so the document still frames cleanly, while everything between it and
// that close tag is pulled inside the fallback and disappears from the page a
// visitor without JavaScript sees.
//
// The check is a comparison rather than a scan, because the two parser modes
// have to agree on everything except the one place they are meant to differ.
// The serialized root is parsed both ways and the trees compared, descending
// into every element except `<noscript>`, whose content is raw text in one mode
// and markup in the other by design. What must match is where each `<noscript>`
// sits and what follows it. Comparing the parsed output rather than the declared
// vnodes also covers a `<noscript>` that arrives inside an `h.InnerHTML`
// fragment, which no walk over the view's own children can see.
// `<noscript>` means something to the parser only in the HTML namespace. Inside
// SVG or MathML an element of that name is an ordinary foreign element whose
// content parses the same way in both modes, so skipping it there would leave a
// real HTML `<noscript>` nested below it unchecked. `<template>` holds its
// children in a separate content fragment rather than in `childNodes`, so its
// content is traversed explicitly; a fallback inside one is invisible otherwise,
// and declarative shadow DOM makes that content live in the page.
const isHtmlNoscript = (element: Parse5Element): boolean =>
  element.tagName.toLowerCase() === 'noscript' &&
  element.namespaceURI === HTML_NAMESPACE

const traversableContent = (
  element: Parse5Element,
): Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }> => {
  if (
    element.tagName.toLowerCase() === 'template' &&
    element.namespaceURI === HTML_NAMESPACE &&
    'content' in element
  ) {
    const content = element.content
    if (
      Predicate.isObject(content) &&
      Predicate.hasProperty(content, 'childNodes')
    ) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return content as Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>
    }
  }
  return element
}

const parsedChildrenAgree = (
  scripted: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
  unscripted: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): boolean => {
  const scriptedChildren = normalizeParsedChildren(scripted)
  const unscriptedChildren = normalizeParsedChildren(unscripted)
  if (scriptedChildren.length !== unscriptedChildren.length) {
    return false
  }
  for (const [scriptedChild, unscriptedChild] of Array.zip(
    scriptedChildren,
    unscriptedChildren,
  )) {
    if (scriptedChild.kind !== unscriptedChild.kind) {
      return false
    }
    if (
      scriptedChild.kind === 'Element' &&
      unscriptedChild.kind === 'Element'
    ) {
      const tagName = scriptedChild.element.tagName.toLowerCase()
      if (
        tagName !== unscriptedChild.element.tagName.toLowerCase() ||
        scriptedChild.element.namespaceURI !==
          unscriptedChild.element.namespaceURI ||
        !parsedAttributesAgree(scriptedChild.element, unscriptedChild.element)
      ) {
        return false
      }
      if (isHtmlNoscript(scriptedChild.element)) {
        continue
      }
      if (
        !parsedChildrenAgree(
          traversableContent(scriptedChild.element),
          traversableContent(unscriptedChild.element),
        )
      ) {
        return false
      }
    } else if (
      scriptedChild.kind === 'Text' &&
      unscriptedChild.kind === 'Text'
    ) {
      if (scriptedChild.text !== unscriptedChild.text) {
        return false
      }
    } else if (
      scriptedChild.kind === 'Comment' &&
      unscriptedChild.kind === 'Comment'
    ) {
      if (scriptedChild.text !== unscriptedChild.text) {
        return false
      }
    }
  }
  return true
}

const parsedAttributesAgree = (
  left: Parse5Element,
  right: Parse5Element,
): boolean => {
  const signature = (element: Parse5Element): ReadonlyArray<string> =>
    element.attrs
      .map(attribute =>
        JSON.stringify([
          attribute.namespace ?? '',
          attribute.prefix ?? '',
          attribute.name,
          attribute.value,
        ]),
      )
      .sort()
  const leftAttributes = signature(left)
  const rightAttributes = signature(right)
  return (
    leftAttributes.length === rightAttributes.length &&
    leftAttributes.every(
      (attribute, index) => attribute === rightAttributes[index],
    )
  )
}

const assertInnerHtmlContextMatches = (
  parsed: Parse5Element,
  vnode: VNode,
): void => {
  const innerHtml = vnode.data?.props?.['innerHTML']
  if (typeof innerHtml !== 'string') {
    return
  }
  const context = defaultTreeAdapter.createElement(
    parsed.tagName,
    parsed.namespaceURI,
    parsed.attrs.map(attribute => ({ ...attribute })),
  )
  const freshChildren = parseFragment(context, innerHtml, {
    scriptingEnabled: true,
  })
  if (parsedChildrenAgree(traversableContent(parsed), freshChildren)) {
    return
  }
  throw new Error(
    `[foldkit] h.InnerHTML on <${parsed.tagName}> parses differently when ` +
      'assigned to a fresh element than when the serialized page is parsed ' +
      'under its ancestors. Ancestor parser state can insert, move, or drop ' +
      'nodes from the server DOM (for example, a nested <form> is dropped ' +
      'under an existing form), so the server and client cannot describe one ' +
      'tree. Move the fragment outside that context or build the content with ' +
      'ordinary view children.',
  )
}

const assertNoscriptModesAgree = (html: string): void => {
  const scripted = parseFragment(DIV_FRAGMENT_CONTEXT, html, {
    scriptingEnabled: true,
  })
  const unscripted = parseFragment(DIV_FRAGMENT_CONTEXT, html, {
    scriptingEnabled: false,
  })
  if (parsedChildrenAgree(scripted, unscripted)) {
    return
  }
  throw new Error(
    '[foldkit] <noscript> content changes the rest of the page when a browser ' +
      'parses it with scripting disabled. Its content is raw text while ' +
      'scripting is enabled and ordinary HTML when it is not, so fallback ' +
      'markup that leaves an element open (a <form>, <table>, <textarea>, ' +
      '<style>, or comment) pulls the markup that follows the <noscript> ' +
      'inside it, and the visitors the fallback was written for never see it. ' +
      'Ensure the fallback is complete and balanced.',
  )
}

// Declarative shadow DOM is refused rather than modeled. A browser turns a
// `<template shadowrootmode>` into a shadow root as it parses, moving its
// content out of the light DOM entirely, which neither the parser these checks
// use nor hydration's own probe reproduces. The served page and the tree
// hydration reconciles would stop describing the same ownership structure.
//
// The scan runs on the rendered markup, so it covers a fragment that arrived
// through `h.InnerHTML` as well as elements the view declared. It descends into
// template content, where a nested declaration would otherwise sit unseen, and
// it parses both scripting modes, because a `<noscript>` holds raw text in one
// and live markup in the other.
const DECLARATIVE_SHADOW_ROOT_ATTRIBUTES: ReadonlyArray<string> = [
  'shadowrootmode',
  'shadowroot',
]

const declaresShadowRoot = (element: Parse5Element): boolean =>
  element.tagName.toLowerCase() === 'template' &&
  element.namespaceURI === HTML_NAMESPACE &&
  DECLARATIVE_SHADOW_ROOT_ATTRIBUTES.some(name =>
    element.attrs.some(attribute => attribute.name === name),
  )

// NOTE: one recursion per element. `traversableContent` returns a template's
// content fragment and the element itself for everything else, so descending
// into both it and the element visits an ordinary subtree twice, which doubles
// the work at every level. A tree the serializer accepts (depth up to 1000) took
// most of a second at depth 24 and would have blocked the event loop well before
// the depth limit.
const hasDeclarativeShadowRoot = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): boolean =>
  node.childNodes.some(
    child =>
      isParse5Element(child) &&
      (declaresShadowRoot(child) ||
        hasDeclarativeShadowRoot(traversableContent(child))),
  )

export const __assertNoDeclarativeShadowRoot = (html: string): void => {
  const declaresInEitherMode = [true, false].some(scriptingEnabled =>
    hasDeclarativeShadowRoot(
      parseFragment(DIV_FRAGMENT_CONTEXT, html, { scriptingEnabled }),
    ),
  )
  if (!declaresInEitherMode) {
    return
  }
  throw new Error(
    '[foldkit] A rendered <template> declares a shadow root, which server ' +
      'rendering does not support. A browser turns it into a shadow root ' +
      'while parsing, moving its content out of the light DOM, so the served ' +
      'page and the tree hydration reconciles no longer describe the same ' +
      'thing. Attach shadow roots from a custom element instead.',
  )
}

// A <base> parsed anywhere in the live HTML tree changes how every relative URL
// after it resolves, including the client entry a host writes after the rendered
// application. The browser applies a base element in body before hydration can
// remove it, so a view could redirect its own bootstrap module to another
// origin. Template content is inert and does not participate in URL resolution;
// declarative shadow templates are refused separately.
const hasLiveBaseElement = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): boolean => {
  for (const child of node.childNodes) {
    if (!isParse5Element(child)) {
      continue
    }
    const tagName = child.tagName.toLowerCase()
    if (child.namespaceURI === HTML_NAMESPACE && tagName === 'base') {
      return true
    }
    if (child.namespaceURI === HTML_NAMESPACE && tagName === 'template') {
      continue
    }
    if (hasLiveBaseElement(child)) {
      return true
    }
  }
  return false
}

export const __assertNoLiveBaseElement = (html: string): void => {
  const hasBaseInEitherMode = [true, false].some(scriptingEnabled =>
    hasLiveBaseElement(
      parseFragment(DIV_FRAGMENT_CONTEXT, html, { scriptingEnabled }),
    ),
  )
  if (!hasBaseInEitherMode) {
    return
  }
  throw new Error(
    '[foldkit] Rendered application markup contains a live HTML <base> ' +
      'element. A browser applies it before hydration, so it changes every ' +
      'relative URL that follows the application, including the client entry ' +
      'module, and can redirect startup to another origin. Put <base> in the ' +
      'HTML template head under host control instead.',
  )
}

// A page the rendered markup is placed into, with a probe element standing
// where the application root goes. Parsing the whole document is what makes a
// structural escape visible: `<html>` and `<body>` start tags inside the markup
// are dropped by a fragment parse, so a check that only ever sees a fragment
// reads them as harmless. A browser instead merges their attributes onto the
// document's own elements and hoists their content, which puts them outside the
// application's ownership entirely.
const DOCUMENT_PROBE_ID = 'foldkit-document-probe'
const DOCUMENT_PROBE_PREFIX =
  '<!doctype html><html><head><title>probe</title></head><body><div id="' +
  DOCUMENT_PROBE_ID +
  '">'
const DOCUMENT_PROBE_SUFFIX = '</div></body></html>'

const childElementsOf = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): ReadonlyArray<Parse5Element> => node.childNodes.filter(isParse5Element)

const findByTag = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
  tagName: string,
): Parse5Element | undefined =>
  childElementsOf(node).find(
    element => element.tagName.toLowerCase() === tagName,
  )

const escapesDocumentStructure = (
  html: string,
  scriptingEnabled: boolean,
): boolean => {
  const document = parse(
    `${DOCUMENT_PROBE_PREFIX}${html}${DOCUMENT_PROBE_SUFFIX}`,
    { scriptingEnabled },
  )
  const documentElement = findByTag(document, 'html')
  if (documentElement === undefined) {
    return true
  }
  const head = findByTag(documentElement, 'head')
  const body = findByTag(documentElement, 'body')
  if (head === undefined || body === undefined) {
    return true
  }
  const probe = childElementsOf(body)[0]
  return (
    documentElement.attrs.length > 0 ||
    body.attrs.length > 0 ||
    head.attrs.length > 0 ||
    childElementsOf(head).length !== 1 ||
    childElementsOf(body).length !== 1 ||
    probe === undefined ||
    probe.attrs.find(attribute => attribute.name === 'id')?.value !==
      DOCUMENT_PROBE_ID
  )
}

export const __assertNoDocumentStructureEscape = (html: string): void => {
  if (![true, false].some(mode => escapesDocumentStructure(html, mode))) {
    return
  }
  throw new Error(
    '[foldkit] The rendered markup changes the document it is placed into. ' +
      'An <html>, <head>, <body>, or <frameset> tag inside it, typically from ' +
      'an InnerHTML fragment, is not rendered where it is written: a browser ' +
      "merges its attributes onto the page's own elements and hoists its " +
      'content out of the application root, so the result is neither the ' +
      'markup the view wrote nor anything the application owns. Remove those ' +
      'tags from the fragment.',
  )
}

const assertRootClosesCleanly = (html: string): void => {
  if (closesCleanly(html, true) && closesCleanly(html, false)) {
    return
  }
  throw new Error(
    '[foldkit] The rendered root does not close cleanly. An unterminated ' +
      'element (an unclosed <textarea>, <script>, <style>, comment, or ' +
      '<plaintext>, typically inside an InnerHTML fragment) would swallow the ' +
      'Flags payload, the client entry, and the rest of the document when the ' +
      'page is parsed. The check covers <noscript> fallback markup with ' +
      'scripting disabled too, where the content parses as HTML rather than as ' +
      'raw text. Ensure InnerHTML fragments are complete and balanced.',
  )
}

// The tags that name a document's own structure. A browser builds these from
// the served document, not from markup spliced into it: a `<body>` or `<head>`
// start tag encountered inside the document body is dropped and its children
// are hoisted, an `<html>` start tag only merges its attributes onto the
// document element, and `<frameset>` replaces the body outright. A view rooted
// at one of them therefore serializes to markup no template can hold, so it is
// refused by name rather than surfacing later as a parser-rearranged root.
const DOCUMENT_STRUCTURE_TAGS: ReadonlySet<string> = new Set([
  'body',
  'frameset',
  'head',
  'html',
])

const assertRootIsNotDocumentStructure = (
  root: NonNullable<Document['body']>,
): void => {
  const tagName = tagNameFromSelector(root.sel ?? '').toLowerCase()
  if (!DOCUMENT_STRUCTURE_TAGS.has(tagName)) {
    return
  }
  throw new Error(
    `[foldkit] The view root is <${tagName}>, which names the structure of a ` +
      'document rather than content placed into one. A browser builds those ' +
      'elements from the document it parses, so the tag is dropped, merged, ' +
      'or replaces the body when the rendered markup is spliced into a ' +
      'template, and the served root is not the element the view wrote. This ' +
      'holds for static output too. Root the view at an ordinary element ' +
      'such as a <div> or <main>, and set the document title, lang, and dir ' +
      'through the Document the view returns.',
  )
}

const RESERVED_HANDOFF_ATTRIBUTES: ReadonlySet<string> = new Set([
  FOLDKIT_APP_ATTRIBUTE,
  HYDRATION_BUILD_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  HYDRATION_IDENTITY_ATTRIBUTE,
])

const reservedHandoffAttributeIn = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): string | undefined => {
  for (const child of node.childNodes) {
    if (!isParse5Element(child)) {
      continue
    }
    const marker = child.attrs.find(attribute =>
      RESERVED_HANDOFF_ATTRIBUTES.has(attribute.name),
    )
    if (marker !== undefined) {
      return marker.name
    }
    const nested = reservedHandoffAttributeIn(traversableContent(child))
    if (nested !== undefined) {
      return nested
    }
  }
  return undefined
}

const hasScriptElement = (
  node: Readonly<{ childNodes: ReadonlyArray<Parse5ChildNode> }>,
): boolean =>
  node.childNodes.some(
    child =>
      isParse5Element(child) &&
      (child.tagName.toLowerCase() === 'script' ||
        hasScriptElement(traversableContent(child))),
  )

const assertViewDoesNotAuthorReservedContent = (node: VNode): void => {
  const attrs = node.data?.attrs
  if (attrs !== undefined) {
    for (const name of Object.keys(attrs)) {
      const parsedName = parsedAttributeName(node.data?.ns, name)
      if (RESERVED_HANDOFF_ATTRIBUTES.has(parsedName)) {
        throw new Error(
          `[foldkit] The view authored ${parsedName}, which is reserved for ` +
            'Foldkit\u2019s server-to-client hydration handoff. Application ' +
            'markup cannot own root, build, Flags, key, or identity markers. ' +
            'Remove the attribute.',
        )
      }
    }
  }
  const innerHtml = node.data?.props?.['innerHTML']
  if (typeof innerHtml === 'string' && hasTrustedInnerHtml(node.data?.props)) {
    const tagName = expectedParsedTagName(node)
    const namespace =
      node.data?.ns === SVG_NAMESPACE
        ? Parse5Html.NS.SVG
        : node.data?.ns === MATHML_NAMESPACE
          ? Parse5Html.NS.MATHML
          : Parse5Html.NS.HTML
    const context = defaultTreeAdapter.createElement(tagName, namespace, [])
    const parsedFragments = [true, false].map(scriptingEnabled =>
      parseFragment(context, innerHtml, { scriptingEnabled }),
    )
    const marker = parsedFragments
      .map(reservedHandoffAttributeIn)
      .find(candidate => candidate !== undefined)
    if (marker !== undefined) {
      throw new Error(
        `[foldkit] h.InnerHTML on <${tagName}> authored ${marker}, which is ` +
          'reserved for Foldkit\u2019s server-to-client hydration handoff. ' +
          'Application markup cannot own root, build, Flags, key, or identity ' +
          'markers. Remove the attribute.',
      )
    }
    if (parsedFragments.some(hasScriptElement)) {
      throw new Error(
        `[foldkit] h.InnerHTML on <${tagName}> contains a <script> element. ` +
          'A script element created while parsing served HTML is not ' +
          'equivalent to one created by assigning innerHTML. Executable forms ' +
          'can run only on the server path, and other script types have ' +
          'type-specific processing that Foldkit does not model. Foldkit ' +
          'therefore refuses classic, module, import-map, speculation-rules, ' +
          'and data-block scripts at this boundary. Build the script as an ' +
          'ordinary view element or move it to the HTML template instead.',
      )
    }
  }
  for (const child of node.children ?? []) {
    if (typeof child !== 'string') {
      assertViewDoesNotAuthorReservedContent(child)
    }
  }
}

const elementsAtAndBelow = (
  element: Parse5Element,
): ReadonlyArray<Parse5Element> => {
  const elements: globalThis.Array<Parse5Element> = [element]
  for (const child of traversableContent(element).childNodes) {
    if (isParse5Element(child)) {
      elements.push(...elementsAtAndBelow(child))
    }
  }
  return elements
}

const elementsCarrying = (
  root: Parse5Element,
  attributeName: string,
): ReadonlyArray<Parse5Element> =>
  elementsAtAndBelow(root).filter(element =>
    element.attrs.some(attribute => attribute.name === attributeName),
  )

const assertNoReservedHandoffMarkers = (root: Parse5Element): void => {
  const maybeMarker = Array.findFirst(
    Array.fromIterable(RESERVED_HANDOFF_ATTRIBUTES),
    attributeName => elementsCarrying(root, attributeName).length > 0,
  )
  if (Option.isNone(maybeMarker)) {
    return
  }
  throw new Error(
    `[foldkit] Static output contains ${maybeMarker.value}, which is reserved for ` +
      'Foldkit\u2019s server-to-client hydration handoff. A render that no ' +
      'client will hydrate must not carry hydration markers.',
  )
}

// After serialization, parse the stamped root markup with the same HTML parser
// a browser uses and require it to describe exactly one element: the stamped
// root, with the tag and namespace the view produced. A view can serialize a
// structurally invalid shape the parser rearranges (a block element inside a
// `<p>`, a stray element inside a `<table>`, an HTML element inside `<svg>`),
// moving nodes outside the element the client hydrates. Hydration owns only
// that root, so it cannot remove escaped siblings; rejecting here keeps the
// invariant that the served root parses back to the single intended element.
// The single element the served markup parses back to, or a refusal naming what
// the parser did to it instead.
const parsedRootOf = (
  html: string,
  root: NonNullable<Document['body']>,
): Parse5Element => {
  const fragment = parseFragment(DIV_FRAGMENT_CONTEXT, html, {})
  const significant = fragment.childNodes.filter(node => !isIgnorableText(node))
  const only = significant[0]
  if (
    significant.length !== 1 ||
    only === undefined ||
    !isParse5Element(only)
  ) {
    throw new Error(
      '[foldkit] The rendered root serialized to markup that HTML parsing ' +
        'splits into more than one top-level node. An element the parser ' +
        'moves out of its parent (a block element inside a <p>, a stray ' +
        'element inside a <table>, or an HTML element inside an <svg>) ' +
        'leaves content outside the application root. Keep the view root a ' +
        'single, structurally valid element tree.',
    )
  }
  const expectedTag = expectedParsedTagName(root)
  const expectedNamespace =
    typeof root.data?.ns === 'string' ? root.data.ns : HTML_NAMESPACE
  if (
    expectedNamespace !== HTML_NAMESPACE &&
    only.namespaceURI === expectedNamespace &&
    only.tagName !== expectedTag
  ) {
    throw foreignTagNameMismatch(only.tagName, expectedTag)
  }
  if (only.tagName !== expectedTag || only.namespaceURI !== expectedNamespace) {
    throw new Error(
      '[foldkit] HTML parsing reinterpreted the rendered root as a ' +
        `<${only.tagName}>, not the view's <${expectedTag}>. Keep the view ` +
        'root a single, structurally valid element.',
    )
  }
  return only
}

// After serialization, parse the root markup with the same HTML parser a browser
// uses and require it to describe the tree the view wrote. A view can serialize
// a structurally invalid shape the parser rearranges (a block element inside a
// `<p>`, a bare `<tr>` in a `<table>`, text foster-parented out of a table),
// moving or dropping nodes the view declared.
//
// This runs for a static render too. Hydration is what would otherwise rebuild a
// reshaped subtree, so without it a dropped subtree is simply lost, with nothing
// left to notice. What stays conditional is the marker check below: only a
// hydratable render emits a stamp for the parser to move.
const assertParsedRootMatchesView = (
  html: string,
  root: NonNullable<Document['body']>,
): void => {
  const parsed = parsedRootOf(html, root)
  assertNoReservedHandoffMarkers(parsed)
  assertStructureMatches(parsed, root)
}

const assertSingleStampedRoot = (
  html: string,
  runtimeId: string,
  buildId: string,
  root: NonNullable<Document['body']>,
): void => {
  const only = parsedRootOf(html, root)
  const applicationMarkers = elementsCarrying(only, FOLDKIT_APP_ATTRIBUTE)
  const buildMarkers = elementsCarrying(only, HYDRATION_BUILD_ATTRIBUTE)
  const flagsMarkers = elementsCarrying(only, FOLDKIT_FLAGS_ATTRIBUTE)
  const stamp = only.attrs.find(
    attribute => attribute.name === FOLDKIT_APP_ATTRIBUTE,
  )
  const buildStamp = only.attrs.find(
    attribute => attribute.name === HYDRATION_BUILD_ATTRIBUTE,
  )
  if (
    applicationMarkers.length !== 1 ||
    applicationMarkers[0] !== only ||
    stamp?.value !== runtimeId ||
    buildMarkers.length !== 1 ||
    buildMarkers[0] !== only ||
    buildStamp?.value !== buildId ||
    flagsMarkers.length !== 0
  ) {
    throw new Error(
      '[foldkit] The rendered root does not carry exactly one Foldkit root ' +
        'and build marker on the root itself, or application markup contains ' +
        'a reserved root, build, or Flags marker below it. The client could ' +
        'resolve an ambiguous root or payload and refuse the page. Remove ' +
        'application-authored data-foldkit handoff markers.',
    )
  }
  assertStructureMatches(only, root)
}

export { FOLDKIT_APP_ATTRIBUTE, FOLDKIT_FLAGS_ATTRIBUTE }

const DEFAULT_RUNTIME_ID = 'app'

/** The server render of one request: the body markup and the `Document` head
 *  fields for the host to place into its HTML template. Hydratable output
 *  contains a stamped root and, when the application declares Flags, its
 *  payload script. Static output carries no handoff markers.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  canonical?: string
  ogUrl?: string
}>

/** Failure of a routing render whose `url` option cannot be parsed.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidUrl extends Data.TaggedError('InvalidUrl')<{
  url: string
}> {}

/** Failure producing the Flags payload: the Schema encode step rejected the
 *  Flags value, the encoded value could not be serialized to JSON, or the
 *  encoded value could not be decoded back for the hydration-consistent
 *  render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class FlagsEncodeError extends Data.TaggedError('FlagsEncodeError')<{
  cause: unknown
}> {}

/** Failure serializing the view-produced vnode tree to safe HTML.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class SerializationError extends Data.TaggedError('SerializationError')<{
  cause: unknown
}> {}

/** Failure of a render whose `runtimeId` is empty.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidRuntimeId extends Data.TaggedError('InvalidRuntimeId')<{
  runtimeId: string
}> {}

/** Failure of a hydratable render whose view did not return an element root.
 * Text, comments, and an empty body cannot carry the hydration marker the
 * client runtime uses to adopt the server-rendered DOM.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidHydrationRoot extends Data.TaggedError(
  'InvalidHydrationRoot',
)<{
  rootKind: 'Empty' | 'Text' | 'Comment'
}> {}

/** Failure of a hydratable render that was given no build id. Hydration
 * compares the id on the served root with the client's own to refuse a page
 * from another deployment, so a render that carries none has no such
 * protection. Supply one from a value the deployment already has, such as a
 * commit or a release tag, through `@foldkit/vite-plugin`'s `buildId` option or
 * the `FOLDKIT_BUILD_ID` environment variable, and pass
 * `import.meta.env.FOLDKIT_BUILD_ID` to `renderToString` and `Runtime.hydrate`.
 * A render that nothing will hydrate (`isHydratable: false`) needs none.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class MissingBuildId extends Data.TaggedError('MissingBuildId')<{}> {}

/** Union of the failures {@link renderToString} can produce.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderError =
  | MissingBuildId
  | InvalidUrl
  | FlagsEncodeError
  | SerializationError
  | InvalidRuntimeId
  | InvalidHydrationRoot

type InitReturn<Model, Message> = UpdateReturn<Model, Message, any>

/** Server-side subset of a routing `makeApplication` config with Flags. The
 *  full application config is structurally assignable; `container`, `update`,
 *  and `subscriptions` play no part in a server render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RoutingApplicationConfigWithFlags<Model, Message, Flags> =
  Readonly<{
    Flags: Schema.Codec<Flags, any, never, never>
    routing: unknown
    init: (flags: Flags, url: Url) => InitReturn<Model, Message>
    view: (model: Model, h: HtmlBuilder<Message>) => Document
  }>

/** Server-side subset of a routing `makeApplication` config without Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RoutingApplicationConfig<Model, Message> = Readonly<{
  routing: unknown
  init: (url: Url) => InitReturn<Model, Message>
  view: (model: Model, h: HtmlBuilder<Message>) => Document
}>

/** Server-side subset of a non-routing `makeApplication` config with Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ApplicationConfigWithFlags<Model, Message, Flags> = Readonly<{
  Flags: Schema.Codec<Flags, any, never, never>
  init: (flags: Flags) => InitReturn<Model, Message>
  view: (model: Model, h: HtmlBuilder<Message>) => Document
}>

/** Server-side subset of a non-routing `makeApplication` config.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ApplicationConfig<Model, Message> = Readonly<{
  init: () => InitReturn<Model, Message>
  view: (model: Model, h: HtmlBuilder<Message>) => Document
}>

// Shared by both render shapes. `runtimeId` names the application in the root
// stamp and Flags payload; it defaults to `'app'` and must be non-empty. It
// also keys the Model and scroll position hot reloading preserves. A document
// may contain one hydratable root. Template injection and hydration refuse a
// second root whether it carries the same id or a distinct one because runtime
// ids do not divide ownership of document metadata and navigation listeners.

type CommonRenderOptions = Readonly<{
  runtimeId?: string
}>

/** Render options for output a client will hydrate, which is the default. The
 *  build id is required here: hydration compares it against the client's own
 *  before adopting any DOM, and a page carrying none has no such protection.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type HydratableRenderOptions = CommonRenderOptions &
  Readonly<{
    isHydratable?: true
    /**
     * The deployment this render belongs to, stamped on the root so hydration
     * can refuse a page from a different one before adopting its DOM. Pass
     * `import.meta.env.FOLDKIT_BUILD_ID`, which `@foldkit/vite-plugin` fills
     * from its `buildId` option or the `FOLDKIT_BUILD_ID` environment variable,
     * and give the client entry the same value.
     */
    buildId: string
  }>

/** Render options for static markup nothing will hydrate. No build id applies,
 *  because no client will compare one.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type StaticRenderOptions = CommonRenderOptions &
  Readonly<{
    isHydratable: false
    buildId?: undefined
  }>

/** Options for {@link renderToString}. `runtimeId` names the application in the
 *  root stamp and Flags payload; it defaults to `'app'` and must be non-empty.
 *  A nondefault `runtimeId` changes the root, Flags, and HMR pairing. It does
 *  not permit a second hydratable application in one document.
 *
 *  A hydratable render (the default) requires `buildId`. Pass
 *  `isHydratable: false` for static markup that nothing will hydrate, which
 *  takes no build id.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderOptions = HydratableRenderOptions | StaticRenderOptions

/** Render options for a routing application, adding the request URL.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderUrlOptions = RenderOptions &
  Readonly<{
    url: string
  }>

/** Render options for a Flags application, adding the per-request Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderFlagsOptions<Flags> = RenderOptions &
  Readonly<{
    flags: Flags
  }>

/** Render options for a routing Flags application: the request URL plus the
 *  per-request Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderUrlFlagsOptions<Flags> = RenderUrlOptions &
  RenderFlagsOptions<Flags>

const noOpDispatch: DispatchSync = () => {}

// NOTE: the html builder reads its dispatch context from a process-wide
// frame stack (`setRuntime` / `clearRuntime`) rather than an argument, so
// this push/render/pop bracket must never interleave with another render's.
// It cannot: JavaScript switches tasks only at async boundaries, and the
// bracket is fully synchronous (`view` returns a Document without awaiting),
// so it runs to completion before any other render can start. That atomicity
// is why no per-request context (AsyncLocalStorage) is needed. The Scene
// test harness and the client runtime drive a view the same way. A `view`
// that suspended mid-render would break the invariant; views are pure and
// cannot.
const runView = <Model>(
  view: (model: Model, h: HtmlBuilder<any>) => Document,
  model: Model,
): Document => {
  const boundaryRegistry = createBoundaryRegistry()
  beginRender(boundaryRegistry)
  setRuntime(noOpDispatch, Context.empty(), boundaryRegistry)
  try {
    const doc = view(model, htmlBuilderFor())
    void drainPatchOutlines(boundaryRegistry)
    return doc
  } finally {
    clearRuntime()
  }
}

// NOTE: `<` becomes `\u003c` inside the payload so no embedded value can
// form a `</script>` sequence and close the element early. The escape is
// JSON-native, so `JSON.parse` restores the original character during
// hydration.
const escapeJsonForScriptElement = (json: string): string =>
  json.replace(/</g, '\\u003c')

const flagsPayloadScript = (runtimeId: string, json: string): string =>
  `<script type="application/json" ${FOLDKIT_FLAGS_ATTRIBUTE}="${escapeAttributeValue(runtimeId)}">${escapeJsonForScriptElement(json)}</script>`

const encodeFlagsHandoff = <Flags>(
  FlagsCodec: Schema.Codec<Flags, any, never, never>,
  flags: Flags,
  runtimeId: string,
): Effect.Effect<
  Readonly<{ payloadScript: string; hydrationFlags: Flags }>,
  FlagsEncodeError
> =>
  Effect.gen(function* () {
    const FlagsJsonCodec = Schema.toCodecJson(FlagsCodec)
    const encodedFlags = yield* pipe(
      flags,
      Schema.encodeEffect(FlagsJsonCodec),
      Effect.mapError(cause => new FlagsEncodeError({ cause })),
    )
    const json = yield* Effect.try({
      try: () => JSON.stringify(encodedFlags),
      catch: cause => new FlagsEncodeError({ cause }),
    })
    if (!Predicate.isString(json)) {
      return yield* Effect.fail(
        new FlagsEncodeError({
          cause: new Error(
            'Flags encoded to a value JSON cannot represent, so no payload can be embedded',
          ),
        }),
      )
    }
    // NOTE: the hydrating client reconstructs Flags by parsing the payload
    // JSON and decoding it synchronously, so the server render must call init
    // with that same value. Decoding the in-memory encoded value instead would
    // diverge wherever JSON is not the identity (a -0 serializes to 0, a
    // non-finite number to null), and decoding through an Effect would accept an
    // asynchronous codec the synchronous client cannot, deferring the failure to
    // a client crash. Parsing json and decoding it the same synchronous way the
    // client does avoids both: the served DOM matches the client's first render,
    // and an incompatible codec fails here as a typed error.
    const hydrationFlags = yield* Effect.try({
      try: () => Schema.decodeUnknownSync(FlagsJsonCodec)(JSON.parse(json)),
      catch: cause => new FlagsEncodeError({ cause }),
    })
    return {
      payloadScript: flagsPayloadScript(runtimeId, json),
      hydrationFlags,
    }
  })

const parseUrl = (url: string): Effect.Effect<Url, InvalidUrl> =>
  Option.match(fromString(url), {
    onNone: () => Effect.fail(new InvalidUrl({ url })),
    onSome: Effect.succeed,
  })

// The client defaults canonical to `origin + pathname + search` of the current
// location, which drops the fragment and normalizes host case and default
// ports. Building the server default with the WHATWG URL parser reproduces that
// exact string, so the metadata a crawler reads before hydration matches what
// the hydrated page computes.
const normalizedRequestUrl = (
  rawUrl: string | undefined,
): string | undefined => {
  if (rawUrl === undefined) {
    return undefined
  }
  try {
    const parsed = new URL(rawUrl)
    return `${parsed.origin}${parsed.pathname}${parsed.search}`
  } catch {
    return undefined
  }
}

const validateHydrationRoot = (
  body: Document['body'],
): Effect.Effect<void, InvalidHydrationRoot> => {
  if (body === null) {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Empty' }))
  }

  if (body.sel === undefined || body.sel === '') {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Text' }))
  }

  if (body.sel === '!') {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Comment' }))
  }

  return Effect.void
}

/**
 * Renders a `makeApplication`-shaped config to an HTML string on the server.
 *
 * Resolves `init` for the request (with the given Flags and URL when the
 * config declares them), runs the pure `view` under a no-op dispatch frame,
 * and serializes the resulting `Document` body. For hydratable output, the
 * root element is stamped with {@link FOLDKIT_APP_ATTRIBUTE} and, when the
 * config declares `Flags`, the Schema-encoded Flags ride along in a JSON script
 * tag so a hydrating client boots from the same Model.
 *
 * Commands returned by `init` are not run: the rendered HTML is the
 * post-`init` state, and the client runs those Commands after hydration.
 *
 * A hydratable Flags render calls `init` with the encode-then-decode round
 * trip of the given Flags, the exact value the hydrating client will
 * reconstruct, so the served DOM and the client's first render agree by
 * construction even for codecs whose round trip is not the identity.
 *
 * When a routing view omits `Document.canonical`, the render defaults it (and
 * `ogUrl`) to the request URL, normalized the way the client computes the
 * current location but with the query string kept. Set `Document.canonical`
 * explicitly when the query string is not part of the page's identity, such as
 * tracking parameters or a session token, so a crawler does not index every
 * variant as its own canonical page.
 *
 * @example
 * ```typescript
 * const renderedApplication = yield* Server.renderToString(config, {
 *   url: request.url,
 *   flags: { theme },
 *   buildId: import.meta.env.FOLDKIT_BUILD_ID,
 * })
 * ```
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export function renderToString<Model, Message, Flags>(
  config: RoutingApplicationConfigWithFlags<Model, Message, Flags>,
  options: RenderUrlFlagsOptions<Flags>,
): Effect.Effect<RenderedApplication, RenderError>
export function renderToString<Model, Message>(
  config: RoutingApplicationConfig<Model, Message>,
  options: RenderUrlOptions,
): Effect.Effect<RenderedApplication, RenderError>
export function renderToString<Model, Message, Flags>(
  config: ApplicationConfigWithFlags<Model, Message, Flags>,
  options: RenderFlagsOptions<Flags>,
): Effect.Effect<RenderedApplication, RenderError>
// NOTE: `options` is required here as it is on every other overload. It was
// optional, which let `renderToString(config)` typecheck while the Effect it
// returned always failed: a render is hydratable by default and a hydratable
// render has no id to stamp. Requiring the argument moves that to the compiler.
export function renderToString<Model, Message>(
  config: ApplicationConfig<Model, Message>,
  options: RenderOptions,
): Effect.Effect<RenderedApplication, RenderError>
export function renderToString(
  config: Readonly<{
    Flags?: Schema.Codec<unknown, any, never, never>
    routing?: unknown
    init: (...initArguments: ReadonlyArray<any>) => InitReturn<unknown, any>
    view: (model: any, h: HtmlBuilder<any>) => Document
  }>,
  options?: RenderOptions &
    Readonly<{
      url?: string
      flags?: unknown
    }>,
): Effect.Effect<RenderedApplication, RenderError> {
  return Effect.gen(function* () {
    const runtimeId = options?.runtimeId ?? DEFAULT_RUNTIME_ID
    if (runtimeId === '') {
      return yield* Effect.fail(
        new InvalidRuntimeId({
          runtimeId,
        }),
      )
    }
    const hasRouting = config.routing !== undefined
    const FlagsCodec = config.Flags
    const isHydratable = options?.isHydratable ?? true

    // A hydratable render must say which deployment it came from. Deriving it
    // here is not possible: the render cannot see the sources, the
    // configuration, or the dependencies that decide what the view produced, so
    // an id it invented would either differ between the client and server
    // builds of one deployment or be shared by two that render differently.
    // Refusing is the only honest answer, and it names what to supply.
    const configuredBuildId = options?.buildId
    const isConfiguredBuildId =
      Predicate.isString(configuredBuildId) &&
      !String.isEmpty(configuredBuildId)

    if (isHydratable && !isConfiguredBuildId) {
      return yield* Effect.fail(new MissingBuildId())
    }

    const buildId = isConfiguredBuildId ? configuredBuildId : ''

    const url = hasRouting ? yield* parseUrl(options?.url ?? '') : undefined

    const flagsHandoff =
      isHydratable && FlagsCodec !== undefined
        ? yield* encodeFlagsHandoff(FlagsCodec, options?.flags, runtimeId)
        : undefined
    const flagsForInit =
      flagsHandoff !== undefined ? flagsHandoff.hydrationFlags : options?.flags

    const initReturn = ((): InitReturn<unknown, any> => {
      if (FlagsCodec !== undefined) {
        return hasRouting
          ? config.init(flagsForInit, url)
          : config.init(flagsForInit)
      }
      return hasRouting ? config.init(url) : config.init()
    })()
    const nextDocument = runView(config.view, initReturn.model)

    if (isHydratable) {
      yield* validateHydrationRoot(nextDocument.body)
    }

    const rootHtml = yield* Effect.try({
      try: () => {
        // Checked for every render, hydratable or not: static markup is placed
        // into a document the same way, so a document-structure root is
        // rearranged by the parser either way.
        if (nextDocument.body !== null) {
          assertRootIsNotDocumentStructure(nextDocument.body)
          assertViewDoesNotAuthorReservedContent(nextDocument.body)
        }
        // The build id rides on the root so hydration can refuse a page from
        // another deployment before it adopts any of its DOM.
        const html = serializeHtml(
          nextDocument.body,
          isHydratable
            ? {
                rootAttributes: {
                  [FOLDKIT_APP_ATTRIBUTE]: runtimeId,
                  [HYDRATION_BUILD_ATTRIBUTE]: buildId,
                },
                emitHydrationMarkers: true,
              }
            : {},
        )
        // Framing is checked for every render, hydratable or not. Static markup
        // is placed into a document the same way, so a root that does not close
        // cleanly swallows whatever the host writes after it either way.
        assertRootClosesCleanly(html)
        assertNoscriptModesAgree(html)
        __assertNoDeclarativeShadowRoot(html)
        __assertNoDocumentStructureEscape(html)
        __assertNoLiveBaseElement(html)
        if (nextDocument.body !== null) {
          if (isHydratable) {
            assertSingleStampedRoot(html, runtimeId, buildId, nextDocument.body)
          } else {
            assertParsedRootMatchesView(html, nextDocument.body)
          }
        }
        return html
      },
      catch: cause => new SerializationError({ cause }),
    })

    const flagsPayload =
      flagsHandoff !== undefined ? flagsHandoff.payloadScript : ''

    // Mirror the client's document-metadata defaults so the served HTML a
    // crawler reads carries the same canonical and Open Graph URL the hydrated
    // page computes: canonical falls back to the request URL, and ogUrl to the
    // resolved canonical, the chain the runtime applies on the client. A
    // non-routing render has no request URL, so it inherits only an explicitly
    // set canonical.
    const resolvedCanonical =
      nextDocument.canonical ??
      (hasRouting ? normalizedRequestUrl(options?.url) : undefined)
    const resolvedOgUrl = nextDocument.ogUrl ?? resolvedCanonical

    return {
      html: `${rootHtml}${flagsPayload}`,
      title: nextDocument.title,
      ...(nextDocument.lang !== undefined ? { lang: nextDocument.lang } : {}),
      ...(nextDocument.dir !== undefined
        ? { dir: textDirectionToAttribute(nextDocument.dir) }
        : {}),
      ...(resolvedCanonical !== undefined
        ? { canonical: resolvedCanonical }
        : {}),
      ...(resolvedOgUrl !== undefined ? { ogUrl: resolvedOgUrl } : {}),
    }
  })
}
