import {
  Array,
  Context,
  Data,
  Effect,
  Fiber,
  Function,
  Match,
  Option,
  Predicate,
  Record,
  Stream,
  String,
  pipe,
} from 'effect'
import { h } from 'snabbdom'
import type { Attrs, On, Props, VNodeData } from 'snabbdom'

import type { File } from '../file/index.js'
import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { VNode } from '../vdom.js'
import { type ChildAttribute, isChildAttribute } from './childAttribute.js'
import {
  checkScheduledLeave,
  clearDragZoneAfterDrop,
  getDragZoneState,
  processDragEnter,
  processDragLeave,
} from './dragZoneTracking.js'
import {
  type DispatchSync,
  clearRuntime,
  requireDispatch,
  requireRuntimeContext,
  setRuntime,
} from './runtimeSingleton.js'
import { submodel } from './submodel.js'

export { createKeyedLazy, createLazy } from './lazy.js'
export {
  beginRender as __beginRender,
  createBoundaryRegistry as __createBoundaryRegistry,
} from './boundary.js'
export type { BoundaryRegistry } from './boundary.js'
export { childAttributes } from './childAttribute.js'
export type { ChildAttribute } from './childAttribute.js'
export { defineView, submodel } from './submodel.js'
export type { SubmodelConfig, SubmodelView } from './submodel.js'

/** Pushes a dispatch and runtime context frame for the duration of a render.
 *  The runtime calls this immediately before invoking a user `view` and
 *  matches it with {@link __clearRuntime} in a `finally` so an exception
 *  inside view code does not leak the frame to the next render. Test
 *  scaffolding that builds VNodes outside of a real program (Scene, Canvas
 *  view-only tests, Mount tests) uses the same pair. Nested frames are
 *  supported via an internal stack. */
export const __setRuntime = setRuntime

/** Pops the current dispatch and runtime context frame. Must be paired with a
 *  prior {@link __setRuntime} on the same call stack. */
export const __clearRuntime = clearRuntime

/** Returns the current dispatch function. Foldkit's `Canvas.view` reads this
 *  to build its synchronous pointer handlers, since it builds VNodes directly
 *  rather than going through the html factory. Most application code never
 *  needs to call this. */
export const __requireDispatch = requireDispatch

/**
 * The `id` of the DOM element that hosts the Foldkit DevTools shadow root.
 * Lives here (not in `devTools/`) because the `OnBlur` handler below uses it
 * to suppress blur Messages whose `relatedTarget` is this host (i.e. when
 * focus crosses into the DevTools UI). The DevTools overlay imports this
 * constant when creating the host element, so the two stay in sync.
 */
export const DEVTOOLS_HOST_ID = 'foldkit-devtools'

/**
 * Tag symbol attached to file-aware event handler functions so Scene test
 * helpers can distinguish `OnFileChange` from `OnChange` (both register on
 * the DOM `change` event) and `OnDropFiles` from `OnDrop` (both register on
 * the DOM `drop` event). Internal implementation detail. Consumer code
 * should never need to reference this directly.
 */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const FileHandlerSymbol: unique symbol = Symbol.for(
  'foldkit/html/fileHandler',
) as unknown as FileHandlerSymbol
/** Type-level brand for file-aware event handler tags. */
export type FileHandlerSymbol = typeof FileHandlerSymbol

const tagAsFileHandler = <T extends Function>(
  handler: T,
  tag: 'OnFileChange' | 'OnDropFiles',
): T => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ;(handler as unknown as Record<symbol, string>)[FileHandlerSymbol] = tag
  return handler
}

/** Modifier key state extracted from a `KeyboardEvent`. */
export type KeyboardModifiers = Readonly<{
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
}>

const keyboardModifiers = (event: KeyboardEvent): KeyboardModifiers => ({
  shiftKey: event.shiftKey,
  ctrlKey: event.ctrlKey,
  altKey: event.altKey,
  metaKey: event.metaKey,
})

/** A virtual DOM element. Constructed synchronously by the element factories
 *  returned from {@link html}. The runtime patches a `VNode` (or `null` to
 *  render nothing) into the application container. */
export type Html = VNode | null
export type Child = Html | string

/** A view's complete output for the runtime: title, body, and optional document
 *  metadata. The runtime applies `title` to `document.title`, syncs `canonical`
 *  to `<link rel="canonical">` (creating it if absent), syncs `ogUrl` to
 *  `<meta property="og:url">` (creating it if absent), and patches `body` into
 *  the application container.
 *
 *  When `canonical` is omitted, it defaults to the current URL (origin +
 *  pathname + search). When `ogUrl` is omitted, it falls back to `canonical`. */
export type Document = Readonly<{
  title: string
  canonical?: string
  ogUrl?: string
  body: Html
}>

/** Union of all valid HTML, SVG, and MathML tag names. */
export type TagName =
  | 'a'
  | 'abbr'
  | 'address'
  | 'area'
  | 'article'
  | 'aside'
  | 'audio'
  | 'b'
  | 'base'
  | 'bdi'
  | 'bdo'
  | 'blockquote'
  | 'body'
  | 'br'
  | 'button'
  | 'canvas'
  | 'caption'
  | 'cite'
  | 'code'
  | 'col'
  | 'colgroup'
  | 'data'
  | 'datalist'
  | 'dd'
  | 'del'
  | 'details'
  | 'dfn'
  | 'dialog'
  | 'div'
  | 'dl'
  | 'dt'
  | 'em'
  | 'embed'
  | 'fieldset'
  | 'figcaption'
  | 'figure'
  | 'footer'
  | 'form'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'head'
  | 'header'
  | 'hgroup'
  | 'hr'
  | 'html'
  | 'i'
  | 'iframe'
  | 'img'
  | 'input'
  | 'ins'
  | 'kbd'
  | 'label'
  | 'legend'
  | 'li'
  | 'link'
  | 'main'
  | 'map'
  | 'mark'
  | 'menu'
  | 'meta'
  | 'meter'
  | 'nav'
  | 'noscript'
  | 'object'
  | 'ol'
  | 'optgroup'
  | 'option'
  | 'output'
  | 'p'
  | 'picture'
  | 'portal'
  | 'pre'
  | 'progress'
  | 'q'
  | 'rp'
  | 'rt'
  | 'ruby'
  | 's'
  | 'samp'
  | 'script'
  | 'search'
  | 'section'
  | 'select'
  | 'slot'
  | 'small'
  | 'source'
  | 'span'
  | 'strong'
  | 'style'
  | 'sub'
  | 'summary'
  | 'sup'
  | 'table'
  | 'tbody'
  | 'td'
  | 'template'
  | 'textarea'
  | 'tfoot'
  | 'th'
  | 'thead'
  | 'time'
  | 'title'
  | 'tr'
  | 'track'
  | 'u'
  | 'ul'
  | 'var'
  | 'video'
  | 'wbr'
  | 'animate'
  | 'animateMotion'
  | 'animateTransform'
  | 'circle'
  | 'clipPath'
  | 'defs'
  | 'desc'
  | 'ellipse'
  | 'feBlend'
  | 'feColorMatrix'
  | 'feComponentTransfer'
  | 'feComposite'
  | 'feConvolveMatrix'
  | 'feDiffuseLighting'
  | 'feDisplacementMap'
  | 'feDistantLight'
  | 'feDropShadow'
  | 'feFlood'
  | 'feFuncA'
  | 'feFuncB'
  | 'feFuncG'
  | 'feFuncR'
  | 'feGaussianBlur'
  | 'feImage'
  | 'feMerge'
  | 'feMergeNode'
  | 'feMorphology'
  | 'feOffset'
  | 'fePointLight'
  | 'feSpecularLighting'
  | 'feSpotLight'
  | 'feTile'
  | 'feTurbulence'
  | 'filter'
  | 'foreignObject'
  | 'g'
  | 'image'
  | 'line'
  | 'linearGradient'
  | 'marker'
  | 'mask'
  | 'metadata'
  | 'mpath'
  | 'path'
  | 'pattern'
  | 'polygon'
  | 'polyline'
  | 'radialGradient'
  | 'rect'
  | 'set'
  | 'stop'
  | 'svg'
  | 'switch'
  | 'symbol'
  | 'text'
  | 'textPath'
  | 'tspan'
  | 'use'
  | 'view'
  | 'annotation'
  | 'annotation-xml'
  | 'math'
  | 'maction'
  | 'menclose'
  | 'merror'
  | 'mfenced'
  | 'mfrac'
  | 'mglyph'
  | 'mi'
  | 'mlabeledtr'
  | 'mlongdiv'
  | 'mmultiscripts'
  | 'mn'
  | 'mo'
  | 'mover'
  | 'mpadded'
  | 'mphantom'
  | 'mprescripts'
  | 'mroot'
  | 'mrow'
  | 'ms'
  | 'mscarries'
  | 'mscarry'
  | 'msgroup'
  | 'msline'
  | 'mspace'
  | 'msqrt'
  | 'msrow'
  | 'mstack'
  | 'mstyle'
  | 'msub'
  | 'msubsup'
  | 'msup'
  | 'mtable'
  | 'mtd'
  | 'mtext'
  | 'mtr'
  | 'munder'
  | 'munderover'
  | 'semantics'

type OnMountState = {
  fiber: Fiber.Fiber<void>
}

const onMountStates = new WeakMap<Element, OnMountState>()

/** Key under which the OnMount attribute stamps a `{ name }` marker on the
 *  snabbdom `VNodeData`. Snabbdom passes unknown data fields through without
 *  rendering them to the DOM, so the marker is invisible at runtime but
 *  observable by VNode walkers (Scene tests). */
export const FOLDKIT_MOUNT_KEY = 'foldkitMount' as const

/** Marker stamped on `VNodeData[FOLDKIT_MOUNT_KEY]` for any element with an
 *  `OnMount` attribute. Carries the Mount Definition's name so test
 *  introspection can identify pending mounts. */
export type FoldkitMountMarker = Readonly<{
  name: string
  args?: Record<string, unknown>
}>

/** Union of all HTML, SVG, and MathML attributes a virtual DOM element can carry.
 *
 *  When a Submodel publishes attribute groups to a consumer's `toView`
 *  slot, those attributes are wrapped via {@link childAttributes} into
 *  {@link ChildAttribute}, a distinct type that carries the Submodel's
 *  own dispatcher. Element constructors accept the union
 *  `ReadonlyArray<Attribute<Message> | ChildAttribute>`, so consumers
 *  can spread published bundles directly into their own attribute
 *  arrays. */
export type Attribute<Message> = Data.TaggedEnum<{
  Key: { readonly value: string }
  Class: { readonly value: string }
  Id: { readonly value: string }
  Title: { readonly value: string }
  Lang: { readonly value: string }
  Dir: { readonly value: string }
  Tabindex: { readonly value: number }
  Hidden: { readonly value: boolean }
  Contenteditable: { readonly value: string }
  Draggable: { readonly value: boolean }
  Accesskey: { readonly value: string }
  Translate: { readonly value: string }
  Inert: { readonly value: boolean }
  Popover: { readonly value: string }
  Popovertarget: { readonly value: string }
  Popovertargetaction: { readonly value: string }
  OnClick: { readonly message: Message }
  OnClickFocus: { readonly focusSelector: string; readonly message: Message }
  OnDoubleClick: { readonly message: Message }
  OnMouseDown: { readonly message: Message }
  OnMouseUp: { readonly message: Message }
  OnMouseEnter: { readonly message: Message }
  OnMouseLeave: { readonly message: Message }
  OnMouseOver: { readonly message: Message }
  OnMouseOut: { readonly message: Message }
  OnMouseMove: { readonly message: Message }
  OnPointerMove: {
    readonly f: (
      screenX: number,
      screenY: number,
      pointerType: string,
    ) => Option.Option<Message>
  }
  OnPointerLeave: {
    readonly f: (pointerType: string) => Option.Option<Message>
  }
  OnPointerDown: {
    readonly f: (
      pointerType: string,
      button: number,
      screenX: number,
      screenY: number,
      timeStamp: number,
      clientX: number,
      clientY: number,
    ) => Option.Option<Message>
  }
  OnPointerUp: {
    readonly f: (
      screenX: number,
      screenY: number,
      pointerType: string,
      timeStamp: number,
    ) => Option.Option<Message>
  }
  OnKeyDown: {
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyDownPreventDefault: {
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyUp: {
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyUpPreventDefault: {
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyPress: {
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnFocus: { readonly message: Message }
  OnBlur: { readonly message: Message }
  OnInput: { readonly f: (value: string) => Message }
  OnChange: { readonly f: (value: string) => Message }
  OnFileChange: { readonly f: (files: ReadonlyArray<File>) => Message }
  OnSubmit: { readonly message: Message }
  OnReset: { readonly message: Message }
  OnScroll: { readonly f: (scrollTop: number) => Message }
  OnWheel: { readonly message: Message }
  OnCopy: { readonly message: Message }
  OnCut: { readonly message: Message }
  OnPaste: { readonly message: Message }
  OnCancel: { readonly message: Message }
  OnToggle: { readonly f: (isOpen: boolean) => Message }
  OnContextMenu: { readonly message: Message }
  OnDragStart: { readonly message: Message }
  OnDrag: { readonly message: Message }
  OnDragEnd: { readonly message: Message }
  OnDragEnter: { readonly message: Message }
  OnDragLeave: { readonly message: Message }
  OnDragOver: { readonly message: Message }
  AllowDrop: {}
  OnDrop: { readonly message: Message }
  OnDropFiles: { readonly f: (files: ReadonlyArray<File>) => Message }
  OnTouchStart: { readonly message: Message }
  OnTouchEnd: { readonly message: Message }
  OnTouchMove: { readonly message: Message }
  OnTouchCancel: { readonly message: Message }
  OnAnimationStart: { readonly message: Message }
  OnAnimationEnd: { readonly message: Message }
  OnAnimationIteration: { readonly message: Message }
  OnTransitionEnd: { readonly message: Message }
  OnLoad: { readonly message: Message }
  OnError: { readonly message: Message }
  OnPlay: { readonly message: Message }
  OnPause: { readonly message: Message }
  OnEnded: { readonly message: Message }
  OnTimeUpdate: { readonly message: Message }
  OnVolumeChange: { readonly message: Message }
  OnSelect: { readonly message: Message }
  Value: { readonly value: string }
  Checked: { readonly value: boolean }
  Selected: { readonly value: boolean }
  Open: { readonly value: boolean }
  Placeholder: { readonly value: string }
  Name: { readonly value: string }
  Disabled: { readonly value: boolean }
  Readonly: { readonly value: boolean }
  Required: { readonly value: boolean }
  Autofocus: { readonly value: boolean }
  Spellcheck: { readonly value: boolean }
  Autocorrect: { readonly value: string }
  Autocapitalize: { readonly value: string }
  InputMode: { readonly value: string }
  EnterKeyHint: { readonly value: string }
  Multiple: { readonly value: boolean }
  Type: { readonly value: string }
  Accept: { readonly value: string }
  Autocomplete: { readonly value: string }
  Pattern: { readonly value: string }
  Maxlength: { readonly value: number }
  Minlength: { readonly value: number }
  Size: { readonly value: number }
  Cols: { readonly value: number }
  Rows: { readonly value: number }
  Max: { readonly value: string }
  Min: { readonly value: string }
  Step: { readonly value: string }
  For: { readonly value: string }
  Href: { readonly value: string }
  Src: { readonly value: string }
  Alt: { readonly value: string }
  Target: { readonly value: string }
  Rel: { readonly value: string }
  Download: { readonly value: string }
  Action: { readonly value: string }
  Method: { readonly value: string }
  Enctype: { readonly value: string }
  Novalidate: { readonly value: boolean }
  Formaction: { readonly value: string }
  Formmethod: { readonly value: string }
  Formnovalidate: { readonly value: boolean }
  Formtarget: { readonly value: string }
  Formenctype: { readonly value: string }
  Colspan: { readonly value: number }
  Rowspan: { readonly value: number }
  Scope: { readonly value: string }
  Headers: { readonly value: string }
  Span: { readonly value: number }
  Start: { readonly value: number }
  Reversed: { readonly value: boolean }
  CiteAttr: { readonly value: string }
  Datetime: { readonly value: string }
  Wrap: { readonly value: string }
  List: { readonly value: string }
  FormAttr: { readonly value: string }
  LabelAttr: { readonly value: string }
  ContentAttr: { readonly value: string }
  Charset: { readonly value: string }
  HttpEquiv: { readonly value: string }
  Srcset: { readonly value: string }
  Sizes: { readonly value: string }
  Loading: { readonly value: string }
  Decoding: { readonly value: string }
  Fetchpriority: { readonly value: string }
  Crossorigin: { readonly value: string }
  Referrerpolicy: { readonly value: string }
  Integrity: { readonly value: string }
  Hreflang: { readonly value: string }
  Ping: { readonly value: string }
  Sandbox: { readonly value: string }
  Allow: { readonly value: string }
  Srcdoc: { readonly value: string }
  Autoplay: { readonly value: boolean }
  Controls: { readonly value: boolean }
  Loop: { readonly value: boolean }
  Muted: { readonly value: boolean }
  Poster: { readonly value: string }
  Preload: { readonly value: string }
  Playsinline: { readonly value: boolean }
  High: { readonly value: number }
  Low: { readonly value: number }
  Optimum: { readonly value: number }
  Usemap: { readonly value: string }
  Ismap: { readonly value: boolean }
  Role: { readonly value: string }
  AriaLabel: { readonly value: string }
  AriaLabelledBy: { readonly value: string }
  AriaDescribedBy: { readonly value: string }
  AriaHidden: { readonly value: boolean }
  AriaExpanded: { readonly value: boolean }
  AriaSelected: { readonly value: boolean }
  AriaChecked: { readonly value: boolean | 'mixed' }
  AriaDisabled: { readonly value: boolean }
  AriaRequired: { readonly value: boolean }
  AriaInvalid: { readonly value: boolean }
  AriaLive: { readonly value: string }
  AriaControls: { readonly value: string }
  AriaCurrent: { readonly value: string }
  AriaOrientation: { readonly value: string }
  AriaPressed: { readonly value: string }
  AriaHasPopup: { readonly value: string }
  AriaActiveDescendant: { readonly value: string }
  AriaSort: { readonly value: string }
  AriaMultiSelectable: { readonly value: boolean }
  AriaModal: { readonly value: boolean }
  AriaBusy: { readonly value: boolean }
  AriaErrorMessage: { readonly value: string }
  AriaRoleDescription: { readonly value: string }
  AriaAtomic: { readonly value: boolean }
  AriaAutocomplete: { readonly value: string }
  AriaColcount: { readonly value: number }
  AriaColindex: { readonly value: number }
  AriaColspan: { readonly value: number }
  AriaDescription: { readonly value: string }
  AriaDetails: { readonly value: string }
  AriaFlowto: { readonly value: string }
  AriaKeyshortcuts: { readonly value: string }
  AriaLevel: { readonly value: number }
  AriaOwns: { readonly value: string }
  AriaPlaceholder: { readonly value: string }
  AriaPosinset: { readonly value: number }
  AriaReadonly: { readonly value: boolean }
  AriaRelevant: { readonly value: string }
  AriaRowcount: { readonly value: number }
  AriaRowindex: { readonly value: number }
  AriaRowspan: { readonly value: number }
  AriaSetsize: { readonly value: number }
  AriaValuemax: { readonly value: number }
  AriaValuemin: { readonly value: number }
  AriaValuenow: { readonly value: number }
  AriaValuetext: { readonly value: string }
  Attribute: { readonly key: string; readonly value: string }
  DataAttribute: { readonly key: string; readonly value: string }
  Style: { readonly value: Record<string, string> }
  InnerHTML: { readonly value: string }
  ViewBox: { readonly value: string }
  Xmlns: { readonly value: string }
  Fill: { readonly value: string }
  FillRule: { readonly value: string }
  ClipRule: { readonly value: string }
  Stroke: { readonly value: string }
  StrokeWidth: { readonly value: string }
  StrokeLinecap: { readonly value: string }
  StrokeLinejoin: { readonly value: string }
  D: { readonly value: string }
  Cx: { readonly value: string }
  Cy: { readonly value: string }
  R: { readonly value: string }
  X: { readonly value: string }
  Y: { readonly value: string }
  Width: { readonly value: string }
  Height: { readonly value: string }
  X1: { readonly value: string }
  Y1: { readonly value: string }
  X2: { readonly value: string }
  Y2: { readonly value: string }
  Points: { readonly value: string }
  Transform: { readonly value: string }
  Opacity: { readonly value: string }
  StrokeDasharray: { readonly value: string }
  StrokeDashoffset: { readonly value: string }
  Prop: { readonly key: string; readonly value: unknown }
  OnCustomEvent: {
    readonly name: string
    readonly f: (event: CustomEvent<any>) => Message
  }
  OnMount: {
    readonly action: MountAction<Message, any>
  }
}>

interface AttributeDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Attribute<this['A']>
}

const {
  Key,
  Class,
  Id,
  Title,
  Lang,
  Dir,
  Tabindex,
  Hidden,
  Contenteditable,
  Draggable,
  Accesskey,
  Translate,
  Inert,
  Popover,
  Popovertarget,
  Popovertargetaction,
  OnClick,
  OnClickFocus,
  OnDoubleClick,
  OnMouseDown,
  OnMouseUp,
  OnMouseEnter,
  OnMouseLeave,
  OnMouseOver,
  OnMouseOut,
  OnMouseMove,
  OnPointerMove,
  OnPointerLeave,
  OnPointerDown,
  OnPointerUp,
  OnKeyDown,
  OnKeyDownPreventDefault,
  OnKeyUp,
  OnKeyUpPreventDefault,
  OnKeyPress,
  OnFocus,
  OnBlur,
  OnInput,
  OnChange,
  OnFileChange,
  OnSubmit,
  OnReset,
  OnScroll,
  OnWheel,
  OnCopy,
  OnCut,
  OnPaste,
  OnCancel,
  OnToggle,
  OnContextMenu,
  OnDragStart,
  OnDrag,
  OnDragEnd,
  OnDragEnter,
  OnDragLeave,
  OnDragOver,
  AllowDrop,
  OnDrop,
  OnDropFiles,
  OnTouchStart,
  OnTouchEnd,
  OnTouchMove,
  OnTouchCancel,
  OnAnimationStart,
  OnAnimationEnd,
  OnAnimationIteration,
  OnTransitionEnd,
  OnLoad,
  OnError,
  OnPlay,
  OnPause,
  OnEnded,
  OnTimeUpdate,
  OnVolumeChange,
  OnSelect,
  Value,
  Checked,
  Selected,
  Open,
  Placeholder,
  Name,
  Disabled,
  Readonly,
  Required,
  Autofocus,
  Spellcheck,
  Autocorrect,
  Autocapitalize,
  InputMode,
  EnterKeyHint,
  Multiple,
  Type,
  Accept,
  Autocomplete,
  Pattern,
  Maxlength,
  Minlength,
  Size,
  Cols,
  Rows,
  Max,
  Min,
  Step,
  For,
  Href,
  Src,
  Alt,
  Target,
  Rel,
  Download,
  Action,
  Method,
  Enctype,
  Novalidate,
  Formaction,
  Formmethod,
  Formnovalidate,
  Formtarget,
  Formenctype,
  Colspan,
  Rowspan,
  Scope,
  Headers,
  Span,
  Start,
  Reversed,
  CiteAttr,
  Datetime,
  Wrap,
  List,
  FormAttr,
  LabelAttr,
  ContentAttr,
  Charset,
  HttpEquiv,
  Srcset,
  Sizes,
  Loading,
  Decoding,
  Fetchpriority,
  Crossorigin,
  Referrerpolicy,
  Integrity,
  Hreflang,
  Ping,
  Sandbox,
  Allow,
  Srcdoc,
  Autoplay,
  Controls,
  Loop,
  Muted,
  Poster,
  Preload,
  Playsinline,
  High,
  Low,
  Optimum,
  Usemap,
  Ismap,
  Role,
  AriaLabel,
  AriaLabelledBy,
  AriaDescribedBy,
  AriaHidden,
  AriaExpanded,
  AriaSelected,
  AriaChecked,
  AriaDisabled,
  AriaRequired,
  AriaInvalid,
  AriaLive,
  AriaControls,
  AriaCurrent,
  AriaOrientation,
  AriaPressed,
  AriaHasPopup,
  AriaActiveDescendant,
  AriaSort,
  AriaMultiSelectable,
  AriaModal,
  AriaBusy,
  AriaErrorMessage,
  AriaRoleDescription,
  AriaAtomic,
  AriaAutocomplete,
  AriaColcount,
  AriaColindex,
  AriaColspan,
  AriaDescription,
  AriaDetails,
  AriaFlowto,
  AriaKeyshortcuts,
  AriaLevel,
  AriaOwns,
  AriaPlaceholder,
  AriaPosinset,
  AriaReadonly,
  AriaRelevant,
  AriaRowcount,
  AriaRowindex,
  AriaRowspan,
  AriaSetsize,
  AriaValuemax,
  AriaValuemin,
  AriaValuenow,
  AriaValuetext,
  Attribute,
  DataAttribute,
  Style,
  InnerHTML,
  ViewBox,
  Xmlns,
  Fill,
  FillRule,
  ClipRule,
  Stroke,
  StrokeWidth,
  StrokeLinecap,
  StrokeLinejoin,
  D,
  Cx,
  Cy,
  R,
  X,
  Y,
  Width,
  Height,
  X1,
  Y1,
  X2,
  Y2,
  Points,
  Transform,
  Opacity,
  StrokeDasharray,
  StrokeDashoffset,
  Prop,
  OnCustomEvent,
  OnMount,
} = Data.taggedEnum<AttributeDefinition>()

export { Prop, OnCustomEvent }

// BUILD CONTEXT: per-VNode bag of mutable VNode data plus the dispatcher this
// VNode's events route through. Allocated once per unique dispatcher in
// `buildVNodeData`, typically once total (a second time when ChildAttribute
// items route through a child Submodel's own dispatch).
type BuildContext = Readonly<{
  data: VNodeData
  postpatchProps: Array<Readonly<{ propName: string; value: unknown }>>
  dispatch: DispatchSync
  getCapturedContext: () => Context.Context<never>
}>

const setData = <K extends keyof VNodeData>(
  ctx: BuildContext,
  key: K,
  value: VNodeData[K],
): void => {
  ctx.data[key] = value
}

const updateData = <K extends keyof VNodeData>(
  ctx: BuildContext,
  key: K,
  value: Partial<VNodeData[K]>,
): void => {
  const existing = ctx.data[key]
  if (existing === undefined) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ctx.data[key] = value as VNodeData[K]
  } else {
    Object.assign(existing, value)
  }
}

const updateDataProps = (ctx: BuildContext, props: Props): void =>
  updateData(ctx, 'props', props)

const updateDataAttrs = (ctx: BuildContext, attrs: Attrs): void =>
  updateData(ctx, 'attrs', attrs)

// Event handlers chain per DOM event in spread order. Without this,
// `Object.assign` would silently drop earlier handlers for the same
// event when a consumer spreads published ChildAttributes alongside
// their own (e.g. `[...attributes.checkbox, h.OnClick(MyMsg())]` would
// drop one of the two click handlers depending on order). Each chained
// handler is invoked synchronously in registration order; if an
// earlier handler throws, later handlers do not run (mirroring native
// exception propagation, not silently swallowing bugs).
const updateDataOn = (ctx: BuildContext, on: On): void => {
  if (ctx.data.on === undefined) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ctx.data.on = on as On
    return
  }
  const existing = ctx.data.on
  for (const key of Object.keys(on)) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const existingHandler = (existing as Record<string, unknown>)[key] as
      | ((...args: ReadonlyArray<unknown>) => void)
      | undefined
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const newHandler = (on as Record<string, unknown>)[key] as (
      ...args: ReadonlyArray<unknown>
    ) => void
    if (existingHandler === undefined) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ;(existing as Record<string, unknown>)[key] = newHandler
    } else {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ;(existing as Record<string, unknown>)[key] = (
        ...args: ReadonlyArray<unknown>
      ) => {
        existingHandler(...args)
        newHandler(...args)
      }
    }
  }
}

const updatePropsWithPostpatch = (
  ctx: BuildContext,
  propName: string,
  value: unknown,
): void => {
  updateDataProps(ctx, { [propName]: value })
  ctx.postpatchProps.push({ propName, value })
}

// NOTE: Built once at module load. The matcher dispatches on `_tag` and
// returns a thunk that applies the resulting mutation to a per-VNode
// BuildContext. Per-attribute cost drops from O(matcher arms) closure
// allocations to one thunk. `Attribute<unknown>` is the runtime-erased
// shape. Message is purely a TypeScript parameter at this level and
// DispatchSync already accepts unknown.
const attributeMatcher: (
  attribute: Attribute<unknown>,
) => (ctx: BuildContext) => void = Match.type<Attribute<unknown>>().pipe(
  Match.tagsExhaustive({
    Key:
      ({ value }) =>
      (ctx: BuildContext) =>
        setData(ctx, 'key', value),
    Class: ({ value }) => {
      const classObject = pipe(
        value,
        String.split(/\s+/),
        Array.filter(String.isNonEmpty),
        Array.reduce({}, (acc, className) => ({
          ...acc,
          [className]: true,
        })),
      )
      return (ctx: BuildContext) => setData(ctx, 'class', classObject)
    },
    Id:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { id: value }),
    Title:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { title: value }),
    Lang:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { lang: value }),
    Dir:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { dir: value }),
    Tabindex:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { tabIndex: value }),
    Hidden:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { hidden: value }),
    Contenteditable:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { contenteditable: value }),
    Draggable:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { draggable: value }),
    Accesskey:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { accesskey: value }),
    Translate:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { translate: value }),
    Inert:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { inert: value }),
    Popover:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { popover: value }),
    Popovertarget:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { popovertarget: value }),
    Popovertargetaction:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { popovertargetaction: value }),
    OnClick:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { click: () => ctx.dispatch(message) }),
    OnClickFocus:
      ({ focusSelector, message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          click: () => {
            const focusTarget = document.querySelector(focusSelector)
            if (focusTarget instanceof HTMLElement) {
              focusTarget.focus()
            }
            ctx.dispatch(message)
          },
        }),
    OnDoubleClick:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { dblclick: () => ctx.dispatch(message) }),
    OnMouseDown:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mousedown: () => ctx.dispatch(message) }),
    OnMouseUp:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mouseup: () => ctx.dispatch(message) }),
    OnMouseEnter:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mouseenter: () => ctx.dispatch(message) }),
    OnMouseLeave:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mouseleave: () => ctx.dispatch(message) }),
    OnMouseOver:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mouseover: () => ctx.dispatch(message) }),
    OnMouseOut:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mouseout: () => ctx.dispatch(message) }),
    OnMouseMove:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { mousemove: () => ctx.dispatch(message) }),
    OnPointerMove:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          pointermove: (event: PointerEvent) => {
            const maybeMessage = f(
              event.screenX,
              event.screenY,
              event.pointerType,
            )
            if (Option.isSome(maybeMessage)) {
              ctx.dispatch(maybeMessage.value)
            }
          },
        }),
    OnPointerLeave:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          pointerleave: (event: PointerEvent) => {
            const maybeMessage = f(event.pointerType)
            if (Option.isSome(maybeMessage)) {
              ctx.dispatch(maybeMessage.value)
            }
          },
        }),
    OnPointerDown:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          pointerdown: (event: PointerEvent) => {
            const maybeMessage = f(
              event.pointerType,
              event.button,
              event.screenX,
              event.screenY,
              event.timeStamp,
              event.clientX,
              event.clientY,
            )
            if (Option.isSome(maybeMessage)) {
              ctx.dispatch(maybeMessage.value)
            }
          },
        }),
    OnPointerUp:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          pointerup: (event: PointerEvent) => {
            const maybeMessage = f(
              event.screenX,
              event.screenY,
              event.pointerType,
              event.timeStamp,
            )
            if (Option.isSome(maybeMessage)) {
              ctx.dispatch(maybeMessage.value)
            }
          },
        }),
    OnKeyDown:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          keydown: (event: KeyboardEvent) =>
            ctx.dispatch(f(event.key, keyboardModifiers(event))),
        }),
    OnKeyDownPreventDefault:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          keydown: (event: KeyboardEvent) => {
            const maybeMessage = f(event.key, keyboardModifiers(event))
            if (Option.isSome(maybeMessage)) {
              event.preventDefault()
              ctx.dispatch(maybeMessage.value)
            }
          },
        }),
    OnKeyUp:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          keyup: (event: KeyboardEvent) =>
            ctx.dispatch(f(event.key, keyboardModifiers(event))),
        }),
    OnKeyUpPreventDefault:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          keyup: (event: KeyboardEvent) => {
            const maybeMessage = f(event.key, keyboardModifiers(event))
            if (Option.isSome(maybeMessage)) {
              event.preventDefault()
              ctx.dispatch(maybeMessage.value)
            }
          },
        }),
    OnKeyPress:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          keypress: (event: KeyboardEvent) =>
            ctx.dispatch(f(event.key, keyboardModifiers(event))),
        }),
    OnFocus:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { focus: () => ctx.dispatch(message) }),
    OnBlur:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          blur: (event: FocusEvent) => {
            if (
              event.relatedTarget instanceof Element &&
              event.relatedTarget.id === DEVTOOLS_HOST_ID
            ) {
              return
            }
            ctx.dispatch(message)
          },
        }),
    OnInput:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          input: (event: Event) =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            ctx.dispatch(f((event.target as HTMLInputElement).value)),
        }),
    OnChange:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          change: (event: Event) =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            ctx.dispatch(f((event.target as HTMLInputElement).value)),
        }),
    OnFileChange:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          change: tagAsFileHandler((event: Event) => {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            const target = event.target as HTMLInputElement
            const files: ReadonlyArray<File> = target.files
              ? Array.fromIterable(target.files)
              : Array.empty()
            target.value = ''
            ctx.dispatch(f(files))
          }, 'OnFileChange'),
        }),
    OnSubmit:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          submit: (event: Event) => {
            event.preventDefault()
            ctx.dispatch(message)
          },
        }),
    OnReset:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { reset: () => ctx.dispatch(message) }),
    OnScroll:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          scroll: (event: Event) =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            ctx.dispatch(f((event.target as HTMLElement).scrollTop)),
        }),
    OnWheel:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { wheel: () => ctx.dispatch(message) }),
    OnCopy:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { copy: () => ctx.dispatch(message) }),
    OnCut:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { cut: () => ctx.dispatch(message) }),
    OnPaste:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { paste: () => ctx.dispatch(message) }),
    OnCancel:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          cancel: (event: Event) => {
            event.preventDefault()
            ctx.dispatch(message)
          },
        }),
    OnToggle:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          toggle: event =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            ctx.dispatch(f((event.target as HTMLDetailsElement).open)),
        }),
    OnContextMenu:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          contextmenu: (event: Event) => {
            event.preventDefault()
            ctx.dispatch(message)
          },
        }),
    OnDragStart:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { dragstart: () => ctx.dispatch(message) }),
    OnDrag:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { drag: () => ctx.dispatch(message) }),
    OnDragEnd:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { dragend: () => ctx.dispatch(message) }),
    OnDragEnter:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          dragenter: (event: Event) => {
            event.preventDefault()
            const zone = event.currentTarget
            if (!(zone instanceof Element)) {
              ctx.dispatch(message)
              return
            }
            const state = getDragZoneState(zone)
            if (processDragEnter(state, zone, event.target)) {
              ctx.dispatch(message)
            }
          },
        }),
    OnDragLeave:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          dragleave: (event: Event) => {
            const zone = event.currentTarget
            if (!(zone instanceof Element)) {
              ctx.dispatch(message)
              return
            }
            const state = getDragZoneState(zone)
            if (processDragLeave(state, zone, event.target) === 'schedule') {
              queueMicrotask(() => {
                if (checkScheduledLeave(state)) {
                  ctx.dispatch(message)
                }
              })
            }
          },
        }),
    OnDragOver:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          dragover: (event: Event) => {
            event.preventDefault()
            ctx.dispatch(message)
          },
        }),
    AllowDrop: () => (ctx: BuildContext) =>
      updateDataOn(ctx, {
        dragover: (event: Event) => {
          event.preventDefault()
        },
      }),
    OnDrop:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          drop: (event: Event) => {
            event.preventDefault()
            const zone = event.currentTarget
            if (zone instanceof Element) {
              clearDragZoneAfterDrop(zone)
            }
            ctx.dispatch(message)
          },
        }),
    OnDropFiles:
      ({ f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          drop: tagAsFileHandler((event: Event) => {
            event.preventDefault()
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            const dragEvent = event as DragEvent
            const zone = dragEvent.currentTarget
            if (zone instanceof Element) {
              clearDragZoneAfterDrop(zone)
            }
            const files: ReadonlyArray<File> = dragEvent.dataTransfer?.files
              ? Array.fromIterable(dragEvent.dataTransfer.files)
              : Array.empty()
            ctx.dispatch(f(files))
          }, 'OnDropFiles'),
        }),
    OnTouchStart:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { touchstart: () => ctx.dispatch(message) }),
    OnTouchEnd:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { touchend: () => ctx.dispatch(message) }),
    OnTouchMove:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { touchmove: () => ctx.dispatch(message) }),
    OnTouchCancel:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { touchcancel: () => ctx.dispatch(message) }),
    OnAnimationStart:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { animationstart: () => ctx.dispatch(message) }),
    OnAnimationEnd:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { animationend: () => ctx.dispatch(message) }),
    OnAnimationIteration:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { animationiteration: () => ctx.dispatch(message) }),
    OnTransitionEnd:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { transitionend: () => ctx.dispatch(message) }),
    OnLoad:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { load: () => ctx.dispatch(message) }),
    OnError:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { error: () => ctx.dispatch(message) }),
    OnPlay:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { play: () => ctx.dispatch(message) }),
    OnPause:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { pause: () => ctx.dispatch(message) }),
    OnEnded:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { ended: () => ctx.dispatch(message) }),
    OnTimeUpdate:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { timeupdate: () => ctx.dispatch(message) }),
    OnVolumeChange:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { volumechange: () => ctx.dispatch(message) }),
    OnSelect:
      ({ message }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, { select: () => ctx.dispatch(message) }),
    Value:
      ({ value }) =>
      (ctx: BuildContext) =>
        updatePropsWithPostpatch(ctx, 'value', value),
    Checked:
      ({ value }) =>
      (ctx: BuildContext) =>
        updatePropsWithPostpatch(ctx, 'checked', value),
    Selected:
      ({ value }) =>
      (ctx: BuildContext) =>
        updatePropsWithPostpatch(ctx, 'selected', value),
    Open:
      ({ value }) =>
      (ctx: BuildContext) =>
        updatePropsWithPostpatch(ctx, 'open', value),
    Placeholder:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { placeholder: value }),
    Name:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { name: value }),
    Disabled:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { disabled: value }),
    Readonly:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { readOnly: value }),
    Required:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { required: value }),
    Autofocus:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { autofocus: value }),
    Spellcheck:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { spellcheck: value.toString() }),
    Autocorrect:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { autocorrect: value }),
    Autocapitalize:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { autocapitalize: value }),
    InputMode:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { inputmode: value }),
    EnterKeyHint:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { enterkeyhint: value }),
    Multiple:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { multiple: value }),
    Type:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { type: value }),
    Accept:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { accept: value }),
    Autocomplete:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { autocomplete: value }),
    Pattern:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { pattern: value }),
    Maxlength:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { maxLength: value }),
    Minlength:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { minLength: value }),
    Size:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { size: value }),
    Cols:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { cols: value }),
    Rows:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { rows: value }),
    Max:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { max: value }),
    Min:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { min: value }),
    Step:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { step: value }),
    For:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { htmlFor: value }),
    Href:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { href: value }),
    Src:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { src: value }),
    Alt:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { alt: value }),
    Target:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { target: value }),
    Rel:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { rel: value }),
    Download:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { download: value }),
    Action:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { action: value }),
    Method:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { method: value }),
    Enctype:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { enctype: value }),
    Novalidate:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { noValidate: value }),
    Formaction:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { formAction: value }),
    Formmethod:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { formMethod: value }),
    Formnovalidate:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { formNoValidate: value }),
    Formtarget:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { formTarget: value }),
    Formenctype:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { formEnctype: value }),
    Colspan:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { colSpan: value }),
    Rowspan:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { rowSpan: value }),
    Scope:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { scope: value }),
    Headers:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { headers: value }),
    Span:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { span: value }),
    Start:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { start: value }),
    Reversed:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { reversed: value }),
    CiteAttr:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { cite: value }),
    Datetime:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { dateTime: value }),
    Wrap:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { wrap: value }),
    List:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { list: value }),
    FormAttr:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { form: value }),
    LabelAttr:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { label: value }),
    ContentAttr:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { content: value }),
    Charset:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { charset: value }),
    HttpEquiv:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'http-equiv': value }),
    Srcset:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { srcset: value }),
    Sizes:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { sizes: value }),
    Loading:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { loading: value }),
    Decoding:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { decoding: value }),
    Fetchpriority:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { fetchpriority: value }),
    Crossorigin:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { crossorigin: value }),
    Referrerpolicy:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { referrerpolicy: value }),
    Integrity:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { integrity: value }),
    Hreflang:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { hreflang: value }),
    Ping:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { ping: value }),
    Sandbox:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { sandbox: value }),
    Allow:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { allow: value }),
    Srcdoc:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { srcdoc: value }),
    Autoplay:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { autoplay: value }),
    Controls:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { controls: value }),
    Loop:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { loop: value }),
    Muted:
      ({ value }) =>
      (ctx: BuildContext) =>
        updatePropsWithPostpatch(ctx, 'muted', value),
    Poster:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { poster: value }),
    Preload:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { preload: value }),
    Playsinline:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { playsInline: value }),
    High:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { high: value }),
    Low:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { low: value }),
    Optimum:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { optimum: value }),
    Usemap:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { usemap: value }),
    Ismap:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { isMap: value }),
    Role:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { role: value }),
    AriaLabel:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-label': value }),
    AriaLabelledBy:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-labelledby': value }),
    AriaDescribedBy:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-describedby': value }),
    AriaHidden:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-hidden': value.toString() }),
    AriaExpanded:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-expanded': value.toString() }),
    AriaSelected:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-selected': value.toString() }),
    AriaChecked:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-checked': value.toString() }),
    AriaDisabled:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-disabled': value.toString() }),
    AriaRequired:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-required': value.toString() }),
    AriaInvalid:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-invalid': value.toString() }),
    AriaLive:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-live': value }),
    AriaControls:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-controls': value }),
    AriaCurrent:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-current': value }),
    AriaOrientation:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-orientation': value }),
    AriaPressed:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-pressed': value }),
    AriaHasPopup:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-haspopup': value }),
    AriaActiveDescendant:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-activedescendant': value }),
    AriaSort:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-sort': value }),
    AriaMultiSelectable:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-multiselectable': value.toString() }),
    AriaModal:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-modal': value.toString() }),
    AriaBusy:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-busy': value.toString() }),
    AriaErrorMessage:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-errormessage': value }),
    AriaRoleDescription:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-roledescription': value }),
    AriaAtomic:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-atomic': value.toString() }),
    AriaAutocomplete:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-autocomplete': value }),
    AriaColcount:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-colcount': value.toString() }),
    AriaColindex:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-colindex': value.toString() }),
    AriaColspan:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-colspan': value.toString() }),
    AriaDescription:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-description': value }),
    AriaDetails:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-details': value }),
    AriaFlowto:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-flowto': value }),
    AriaKeyshortcuts:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-keyshortcuts': value }),
    AriaLevel:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-level': value.toString() }),
    AriaOwns:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-owns': value }),
    AriaPlaceholder:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-placeholder': value }),
    AriaPosinset:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-posinset': value.toString() }),
    AriaReadonly:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-readonly': value.toString() }),
    AriaRelevant:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-relevant': value }),
    AriaRowcount:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-rowcount': value.toString() }),
    AriaRowindex:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-rowindex': value.toString() }),
    AriaRowspan:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-rowspan': value.toString() }),
    AriaSetsize:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-setsize': value.toString() }),
    AriaValuemax:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-valuemax': value.toString() }),
    AriaValuemin:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-valuemin': value.toString() }),
    AriaValuenow:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-valuenow': value.toString() }),
    AriaValuetext:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'aria-valuetext': value }),
    Attribute:
      ({ key, value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { [key]: value }),
    DataAttribute:
      ({ key, value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { [`data-${key}`]: value }),
    Style:
      ({ value }) =>
      (ctx: BuildContext) =>
        setData(ctx, 'style', value),
    InnerHTML:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { innerHTML: value }),
    ViewBox:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { viewBox: value }),
    Xmlns:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { xmlns: value }),
    Fill:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { fill: value }),
    FillRule:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'fill-rule': value }),
    ClipRule:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'clip-rule': value }),
    Stroke:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { stroke: value }),
    StrokeWidth:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'stroke-width': value }),
    StrokeLinecap:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'stroke-linecap': value }),
    StrokeLinejoin:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'stroke-linejoin': value }),
    D:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { d: value }),
    Cx:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { cx: value }),
    Cy:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { cy: value }),
    R:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { r: value }),
    X:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { x: value }),
    Y:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { y: value }),
    Width:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { width: value }),
    Height:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { height: value }),
    X1:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { x1: value }),
    Y1:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { y1: value }),
    X2:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { x2: value }),
    Y2:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { y2: value }),
    Points:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { points: value }),
    Transform:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { transform: value }),
    Opacity:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { opacity: value }),
    StrokeDasharray:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'stroke-dasharray': value }),
    StrokeDashoffset:
      ({ value }) =>
      (ctx: BuildContext) =>
        updateDataAttrs(ctx, { 'stroke-dashoffset': value }),
    Prop:
      ({ key, value }) =>
      (ctx: BuildContext) =>
        updateDataProps(ctx, { [key]: value }),
    OnCustomEvent:
      ({ name, f }) =>
      (ctx: BuildContext) =>
        updateDataOn(ctx, {
          [name]: (event: Event) => {
            if (event instanceof CustomEvent) {
              ctx.dispatch(f(event))
            }
          },
        }),
    OnMount:
      ({ action }) =>
      (ctx: BuildContext) => {
        const capturedContext = ctx.getCapturedContext()
        const maybeTracker = Context.getOption(capturedContext, MountTracker)
        const notifyStarted = Option.isSome(maybeTracker)
          ? () => maybeTracker.value.started(action.name, action.args)
          : Function.constVoid
        const notifyEnded = Option.isSome(maybeTracker)
          ? () => maybeTracker.value.ended(action.name, action.args)
          : Function.constVoid
        const marker: FoldkitMountMarker =
          action.args === undefined
            ? { name: action.name }
            : { name: action.name, args: action.args }
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        ;(ctx.data as Record<string, unknown>)[FOLDKIT_MOUNT_KEY] = marker
        ctx.data.hook = {
          ...ctx.data.hook,
          insert: vnode => {
            if (vnode.elm instanceof Element) {
              const element = vnode.elm
              notifyStarted()
              const fiber = Effect.runForkWith(capturedContext)(
                Stream.runForEach(action.f(element), message =>
                  Effect.sync(() => ctx.dispatch(message)),
                ).pipe(
                  Effect.catchCause(cause =>
                    Effect.sync(() => {
                      console.error(
                        `[OnMount ${action.name}] unhandled failure`,
                        cause,
                      )
                    }),
                  ),
                ),
              )
              onMountStates.set(element, { fiber })
            }
          },
          destroy: vnode => {
            if (vnode.elm instanceof Element) {
              const state = onMountStates.get(vnode.elm)
              if (state) {
                Effect.runFork(Fiber.interrupt(state.fiber))
                onMountStates.delete(vnode.elm)
                notifyEnded()
              }
            }
          },
        }
      },
  }),
)

const buildVNodeData = <Message>(
  attributes: ReadonlyArray<Attribute<Message> | ChildAttribute>,
): VNodeData => {
  // Capture lazily, and tolerate the absence of a runtime frame. Static
  // elements (`h.code([h.Class('x')], ['text'])`) and prose fragments built
  // at module top level (`const fragment = inlineCode('foo')` at import
  // time) must construct without an active render frame. They never invoke
  // the fallback dispatcher because they have no event handlers; event-
  // bearing Html constructed outside a render reaches the fallback only at
  // event-fire time, which surfaces a clear error rather than failing at
  // import time.
  let cachedCurrentDispatch: DispatchSync | undefined
  const getCurrentDispatch = (): DispatchSync => {
    if (cachedCurrentDispatch === undefined) {
      try {
        cachedCurrentDispatch = requireDispatch()
      } catch {
        cachedCurrentDispatch = () => {
          throw new Error(
            'Foldkit: an event-bearing Html attribute fired without an ' +
              'active runtime frame. This typically means an Html element ' +
              'with event handlers (OnClick, OnInput, etc.) was constructed ' +
              'at module top level outside of a view function.',
          )
        }
      }
    }
    return cachedCurrentDispatch
  }
  let cachedCapturedContext: Context.Context<never> | undefined
  const getCapturedContext = (): Context.Context<never> => {
    if (cachedCapturedContext === undefined) {
      try {
        cachedCapturedContext = requireRuntimeContext()
      } catch {
        cachedCapturedContext = Context.empty()
      }
    }
    return cachedCapturedContext
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const data = {} as VNodeData
  const postpatchProps: Array<Readonly<{ propName: string; value: unknown }>> =
    []

  // Most attributes route through the current frame's dispatch. ChildAttribute
  // items carry a different dispatcher (captured by `childAttributes`
  // in a Submodel's own boundary), so they need their own BuildContext closed
  // over that dispatch. The matcher itself is module-level and shared.
  // The main ctx is built lazily. Static-only attribute arrays (Class, Id,
  // etc. with no event handlers) skip `requireDispatch` entirely so Html can
  // be constructed at module top level.
  let mainCtx: BuildContext | undefined
  const boundaryCtxByDispatch = new Map<DispatchSync, BuildContext>()

  for (const item of attributes) {
    if (isChildAttribute(item)) {
      let ctx = boundaryCtxByDispatch.get(item.dispatch)
      if (ctx === undefined) {
        ctx = {
          data,
          postpatchProps,
          dispatch: item.dispatch,
          getCapturedContext,
        }
        boundaryCtxByDispatch.set(item.dispatch, ctx)
      }
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      attributeMatcher(item.attribute as Attribute<unknown>)(ctx)
    } else {
      if (mainCtx === undefined) {
        mainCtx = {
          data,
          postpatchProps,
          dispatch: getCurrentDispatch(),
          getCapturedContext,
        }
      }
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      attributeMatcher(item as Attribute<unknown>)(mainCtx)
    }
  }

  if (Array.isReadonlyArrayNonEmpty(postpatchProps)) {
    data.hook = {
      ...data.hook,
      postpatch: (_oldVnode, vnode) => {
        if (vnode.elm) {
          Array.forEach(postpatchProps, ({ propName, value }) => {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            if ((vnode.elm as any)[propName] !== value) {
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              ;(vnode.elm as any)[propName] = value
            }
          })
        }
      },
    }
  }

  return data
}

const processVNodeChildren = (
  children: ReadonlyArray<Child>,
): ReadonlyArray<VNode | string> => Array.filter(children, Predicate.isNotNull)

const createElement = <Message>(
  tagName: string,
  attributes: ReadonlyArray<Attribute<Message> | ChildAttribute> = [],
  children: ReadonlyArray<Child> = [],
): Html =>
  h(
    tagName,
    buildVNodeData(attributes),
    Array.fromIterable(processVNodeChildren(children)),
  )

const element =
  <Message>() =>
  (tagName: TagName) =>
  (
    attributes: ReadonlyArray<Attribute<Message> | ChildAttribute> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

export const customElement =
  <Message>() =>
  (tagName: string) =>
  (
    attributes: ReadonlyArray<Attribute<Message> | ChildAttribute> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

const voidElement =
  <Message>() =>
  (tagName: TagName) =>
  (attributes: ReadonlyArray<Attribute<Message> | ChildAttribute> = []): Html =>
    createElement(tagName, attributes, [])

const keyed =
  <Message>() =>
  (tagName: TagName) =>
  (
    key: string,
    attributes: ReadonlyArray<Attribute<Message> | ChildAttribute> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    element<Message>()(tagName)([...attributes, Key({ value: key })], children)

type ElementFunction<Message> = (
  attributes: ReadonlyArray<Attribute<Message> | ChildAttribute>,
  children: ReadonlyArray<Child>,
) => Html

type VoidElementFunction<Message> = (
  attributes: ReadonlyArray<Attribute<Message> | ChildAttribute>,
) => Html

type HtmlElements<Message> = {
  a: ElementFunction<Message>
  abbr: ElementFunction<Message>
  address: ElementFunction<Message>
  area: VoidElementFunction<Message>
  article: ElementFunction<Message>
  aside: ElementFunction<Message>
  audio: ElementFunction<Message>
  b: ElementFunction<Message>
  base: VoidElementFunction<Message>
  bdi: ElementFunction<Message>
  bdo: ElementFunction<Message>
  blockquote: ElementFunction<Message>
  body: ElementFunction<Message>
  br: VoidElementFunction<Message>
  button: ElementFunction<Message>
  canvas: ElementFunction<Message>
  caption: ElementFunction<Message>
  cite: ElementFunction<Message>
  code: ElementFunction<Message>
  col: VoidElementFunction<Message>
  colgroup: ElementFunction<Message>
  data: ElementFunction<Message>
  datalist: ElementFunction<Message>
  dd: ElementFunction<Message>
  del: ElementFunction<Message>
  details: ElementFunction<Message>
  dfn: ElementFunction<Message>
  dialog: ElementFunction<Message>
  div: ElementFunction<Message>
  dl: ElementFunction<Message>
  dt: ElementFunction<Message>
  em: ElementFunction<Message>
  embed: VoidElementFunction<Message>
  fieldset: ElementFunction<Message>
  figcaption: ElementFunction<Message>
  figure: ElementFunction<Message>
  footer: ElementFunction<Message>
  form: ElementFunction<Message>
  h1: ElementFunction<Message>
  h2: ElementFunction<Message>
  h3: ElementFunction<Message>
  h4: ElementFunction<Message>
  h5: ElementFunction<Message>
  h6: ElementFunction<Message>
  head: ElementFunction<Message>
  header: ElementFunction<Message>
  hgroup: ElementFunction<Message>
  hr: VoidElementFunction<Message>
  html: ElementFunction<Message>
  i: ElementFunction<Message>
  iframe: ElementFunction<Message>
  img: VoidElementFunction<Message>
  input: VoidElementFunction<Message>
  ins: ElementFunction<Message>
  kbd: ElementFunction<Message>
  label: ElementFunction<Message>
  legend: ElementFunction<Message>
  li: ElementFunction<Message>
  link: VoidElementFunction<Message>
  main: ElementFunction<Message>
  map: ElementFunction<Message>
  mark: ElementFunction<Message>
  menu: ElementFunction<Message>
  meta: VoidElementFunction<Message>
  meter: ElementFunction<Message>
  nav: ElementFunction<Message>
  noscript: ElementFunction<Message>
  object: ElementFunction<Message>
  ol: ElementFunction<Message>
  optgroup: ElementFunction<Message>
  option: ElementFunction<Message>
  output: ElementFunction<Message>
  p: ElementFunction<Message>
  picture: ElementFunction<Message>
  portal: ElementFunction<Message>
  pre: ElementFunction<Message>
  progress: ElementFunction<Message>
  q: ElementFunction<Message>
  rp: ElementFunction<Message>
  rt: ElementFunction<Message>
  ruby: ElementFunction<Message>
  s: ElementFunction<Message>
  samp: ElementFunction<Message>
  script: ElementFunction<Message>
  search: ElementFunction<Message>
  section: ElementFunction<Message>
  select: ElementFunction<Message>
  slot: ElementFunction<Message>
  small: ElementFunction<Message>
  source: VoidElementFunction<Message>
  span: ElementFunction<Message>
  strong: ElementFunction<Message>
  style: ElementFunction<Message>
  sub: ElementFunction<Message>
  summary: ElementFunction<Message>
  sup: ElementFunction<Message>
  table: ElementFunction<Message>
  tbody: ElementFunction<Message>
  td: ElementFunction<Message>
  template: ElementFunction<Message>
  textarea: ElementFunction<Message>
  tfoot: ElementFunction<Message>
  th: ElementFunction<Message>
  thead: ElementFunction<Message>
  time: ElementFunction<Message>
  title: ElementFunction<Message>
  tr: ElementFunction<Message>
  track: VoidElementFunction<Message>
  u: ElementFunction<Message>
  ul: ElementFunction<Message>
  var: ElementFunction<Message>
  video: ElementFunction<Message>
  wbr: VoidElementFunction<Message>
  svg: ElementFunction<Message>
  animate: ElementFunction<Message>
  animateMotion: ElementFunction<Message>
  animateTransform: ElementFunction<Message>
  circle: ElementFunction<Message>
  clipPath: ElementFunction<Message>
  defs: ElementFunction<Message>
  desc: ElementFunction<Message>
  ellipse: ElementFunction<Message>
  feBlend: ElementFunction<Message>
  feColorMatrix: ElementFunction<Message>
  feComponentTransfer: ElementFunction<Message>
  feComposite: ElementFunction<Message>
  feConvolveMatrix: ElementFunction<Message>
  feDiffuseLighting: ElementFunction<Message>
  feDisplacementMap: ElementFunction<Message>
  feDistantLight: ElementFunction<Message>
  feDropShadow: ElementFunction<Message>
  feFlood: ElementFunction<Message>
  feFuncA: ElementFunction<Message>
  feFuncB: ElementFunction<Message>
  feFuncG: ElementFunction<Message>
  feFuncR: ElementFunction<Message>
  feGaussianBlur: ElementFunction<Message>
  feImage: ElementFunction<Message>
  feMerge: ElementFunction<Message>
  feMergeNode: ElementFunction<Message>
  feMorphology: ElementFunction<Message>
  feOffset: ElementFunction<Message>
  fePointLight: ElementFunction<Message>
  feSpecularLighting: ElementFunction<Message>
  feSpotLight: ElementFunction<Message>
  feTile: ElementFunction<Message>
  feTurbulence: ElementFunction<Message>
  filter: ElementFunction<Message>
  foreignObject: ElementFunction<Message>
  g: ElementFunction<Message>
  image: ElementFunction<Message>
  line: ElementFunction<Message>
  linearGradient: ElementFunction<Message>
  marker: ElementFunction<Message>
  mask: ElementFunction<Message>
  metadata: ElementFunction<Message>
  mpath: ElementFunction<Message>
  path: ElementFunction<Message>
  pattern: ElementFunction<Message>
  polygon: ElementFunction<Message>
  polyline: ElementFunction<Message>
  radialGradient: ElementFunction<Message>
  rect: ElementFunction<Message>
  set: ElementFunction<Message>
  stop: ElementFunction<Message>
  switch: ElementFunction<Message>
  symbol: ElementFunction<Message>
  text: ElementFunction<Message>
  textPath: ElementFunction<Message>
  tspan: ElementFunction<Message>
  use: ElementFunction<Message>
  view: ElementFunction<Message>
  math: ElementFunction<Message>
  annotation: ElementFunction<Message>
  'annotation-xml': ElementFunction<Message>
  maction: ElementFunction<Message>
  menclose: ElementFunction<Message>
  merror: ElementFunction<Message>
  mfenced: ElementFunction<Message>
  mfrac: ElementFunction<Message>
  mglyph: ElementFunction<Message>
  mi: ElementFunction<Message>
  mlabeledtr: ElementFunction<Message>
  mlongdiv: ElementFunction<Message>
  mmultiscripts: ElementFunction<Message>
  mn: ElementFunction<Message>
  mo: ElementFunction<Message>
  mover: ElementFunction<Message>
  mpadded: ElementFunction<Message>
  mphantom: ElementFunction<Message>
  mprescripts: ElementFunction<Message>
  mroot: ElementFunction<Message>
  mrow: ElementFunction<Message>
  ms: ElementFunction<Message>
  mscarries: ElementFunction<Message>
  mscarry: ElementFunction<Message>
  msgroup: ElementFunction<Message>
  msline: ElementFunction<Message>
  mspace: ElementFunction<Message>
  msqrt: ElementFunction<Message>
  msrow: ElementFunction<Message>
  mstack: ElementFunction<Message>
  mstyle: ElementFunction<Message>
  msub: ElementFunction<Message>
  msubsup: ElementFunction<Message>
  msup: ElementFunction<Message>
  mtable: ElementFunction<Message>
  mtd: ElementFunction<Message>
  mtext: ElementFunction<Message>
  mtr: ElementFunction<Message>
  munder: ElementFunction<Message>
  munderover: ElementFunction<Message>
  semantics: ElementFunction<Message>
}

const htmlElements = <Message>(): HtmlElements<Message> => {
  const el = element<Message>()
  const voidEl = voidElement<Message>()

  return {
    // HTML
    a: el('a'),
    abbr: el('abbr'),
    address: el('address'),
    area: voidEl('area'),
    article: el('article'),
    aside: el('aside'),
    audio: el('audio'),
    b: el('b'),
    base: voidEl('base'),
    bdi: el('bdi'),
    bdo: el('bdo'),
    blockquote: el('blockquote'),
    body: el('body'),
    br: voidEl('br'),
    button: el('button'),
    canvas: el('canvas'),
    caption: el('caption'),
    cite: el('cite'),
    code: el('code'),
    col: voidEl('col'),
    colgroup: el('colgroup'),
    data: el('data'),
    datalist: el('datalist'),
    dd: el('dd'),
    del: el('del'),
    details: el('details'),
    dfn: el('dfn'),
    dialog: el('dialog'),
    div: el('div'),
    dl: el('dl'),
    dt: el('dt'),
    em: el('em'),
    embed: voidEl('embed'),
    fieldset: el('fieldset'),
    figcaption: el('figcaption'),
    figure: el('figure'),
    footer: el('footer'),
    form: el('form'),
    h1: el('h1'),
    h2: el('h2'),
    h3: el('h3'),
    h4: el('h4'),
    h5: el('h5'),
    h6: el('h6'),
    head: el('head'),
    header: el('header'),
    hgroup: el('hgroup'),
    hr: voidEl('hr'),
    html: el('html'),
    i: el('i'),
    iframe: el('iframe'),
    img: voidEl('img'),
    input: voidEl('input'),
    ins: el('ins'),
    kbd: el('kbd'),
    label: el('label'),
    legend: el('legend'),
    li: el('li'),
    link: voidEl('link'),
    main: el('main'),
    map: el('map'),
    mark: el('mark'),
    menu: el('menu'),
    meta: voidEl('meta'),
    meter: el('meter'),
    nav: el('nav'),
    noscript: el('noscript'),
    object: el('object'),
    ol: el('ol'),
    optgroup: el('optgroup'),
    option: el('option'),
    output: el('output'),
    p: el('p'),
    picture: el('picture'),
    portal: el('portal'),
    pre: el('pre'),
    progress: el('progress'),
    q: el('q'),
    rp: el('rp'),
    rt: el('rt'),
    ruby: el('ruby'),
    s: el('s'),
    samp: el('samp'),
    script: el('script'),
    search: el('search'),
    section: el('section'),
    select: el('select'),
    slot: el('slot'),
    small: el('small'),
    source: voidEl('source'),
    span: el('span'),
    strong: el('strong'),
    style: el('style'),
    sub: el('sub'),
    summary: el('summary'),
    sup: el('sup'),
    table: el('table'),
    tbody: el('tbody'),
    td: el('td'),
    template: el('template'),
    textarea: el('textarea'),
    tfoot: el('tfoot'),
    th: el('th'),
    thead: el('thead'),
    time: el('time'),
    title: el('title'),
    tr: el('tr'),
    track: voidEl('track'),
    u: el('u'),
    ul: el('ul'),
    var: el('var'),
    video: el('video'),
    wbr: voidEl('wbr'),

    // SVG
    svg: el('svg'),
    animate: el('animate'),
    animateMotion: el('animateMotion'),
    animateTransform: el('animateTransform'),
    circle: el('circle'),
    clipPath: el('clipPath'),
    defs: el('defs'),
    desc: el('desc'),
    ellipse: el('ellipse'),
    feBlend: el('feBlend'),
    feColorMatrix: el('feColorMatrix'),
    feComponentTransfer: el('feComponentTransfer'),
    feComposite: el('feComposite'),
    feConvolveMatrix: el('feConvolveMatrix'),
    feDiffuseLighting: el('feDiffuseLighting'),
    feDisplacementMap: el('feDisplacementMap'),
    feDistantLight: el('feDistantLight'),
    feDropShadow: el('feDropShadow'),
    feFlood: el('feFlood'),
    feFuncA: el('feFuncA'),
    feFuncB: el('feFuncB'),
    feFuncG: el('feFuncG'),
    feFuncR: el('feFuncR'),
    feGaussianBlur: el('feGaussianBlur'),
    feImage: el('feImage'),
    feMerge: el('feMerge'),
    feMergeNode: el('feMergeNode'),
    feMorphology: el('feMorphology'),
    feOffset: el('feOffset'),
    fePointLight: el('fePointLight'),
    feSpecularLighting: el('feSpecularLighting'),
    feSpotLight: el('feSpotLight'),
    feTile: el('feTile'),
    feTurbulence: el('feTurbulence'),
    filter: el('filter'),
    foreignObject: el('foreignObject'),
    g: el('g'),
    image: el('image'),
    line: el('line'),
    linearGradient: el('linearGradient'),
    marker: el('marker'),
    mask: el('mask'),
    metadata: el('metadata'),
    mpath: el('mpath'),
    path: el('path'),
    pattern: el('pattern'),
    polygon: el('polygon'),
    polyline: el('polyline'),
    radialGradient: el('radialGradient'),
    rect: el('rect'),
    set: el('set'),
    stop: el('stop'),
    switch: el('switch'),
    symbol: el('symbol'),
    text: el('text'),
    textPath: el('textPath'),
    tspan: el('tspan'),
    use: el('use'),
    view: el('view'),

    // MATH ML
    math: el('math'),
    annotation: el('annotation'),
    'annotation-xml': el('annotation-xml'),
    maction: el('maction'),
    menclose: el('menclose'),
    merror: el('merror'),
    mfenced: el('mfenced'),
    mfrac: el('mfrac'),
    mglyph: el('mglyph'),
    mi: el('mi'),
    mlabeledtr: el('mlabeledtr'),
    mlongdiv: el('mlongdiv'),
    mmultiscripts: el('mmultiscripts'),
    mn: el('mn'),
    mo: el('mo'),
    mover: el('mover'),
    mpadded: el('mpadded'),
    mphantom: el('mphantom'),
    mprescripts: el('mprescripts'),
    mroot: el('mroot'),
    mrow: el('mrow'),
    ms: el('ms'),
    mscarries: el('mscarries'),
    mscarry: el('mscarry'),
    msgroup: el('msgroup'),
    msline: el('msline'),
    mspace: el('mspace'),
    msqrt: el('msqrt'),
    msrow: el('msrow'),
    mstack: el('mstack'),
    mstyle: el('mstyle'),
    msub: el('msub'),
    msubsup: el('msubsup'),
    msup: el('msup'),
    mtable: el('mtable'),
    mtd: el('mtd'),
    mtext: el('mtext'),
    mtr: el('mtr'),
    munder: el('munder'),
    munderover: el('munderover'),
    semantics: el('semantics'),
  }
}

type HtmlAttributes<Message> = {
  Key: (value: string) => { readonly _tag: 'Key'; readonly value: string }
  Class: (value: string) => { readonly _tag: 'Class'; readonly value: string }
  Id: (value: string) => { readonly _tag: 'Id'; readonly value: string }
  Title: (value: string) => { readonly _tag: 'Title'; readonly value: string }
  Lang: (value: string) => { readonly _tag: 'Lang'; readonly value: string }
  Dir: (value: string) => { readonly _tag: 'Dir'; readonly value: string }
  Tabindex: (value: number) => {
    readonly _tag: 'Tabindex'
    readonly value: number
  }
  Hidden: (value: boolean) => {
    readonly _tag: 'Hidden'
    readonly value: boolean
  }
  Contenteditable: (value: string) => {
    readonly _tag: 'Contenteditable'
    readonly value: string
  }
  Draggable: (value: boolean) => {
    readonly _tag: 'Draggable'
    readonly value: boolean
  }
  Accesskey: (value: string) => {
    readonly _tag: 'Accesskey'
    readonly value: string
  }
  Translate: (value: string) => {
    readonly _tag: 'Translate'
    readonly value: string
  }
  Inert: (value: boolean) => {
    readonly _tag: 'Inert'
    readonly value: boolean
  }
  Popover: (value: string) => {
    readonly _tag: 'Popover'
    readonly value: string
  }
  Popovertarget: (value: string) => {
    readonly _tag: 'Popovertarget'
    readonly value: string
  }
  Popovertargetaction: (value: string) => {
    readonly _tag: 'Popovertargetaction'
    readonly value: string
  }
  OnClick: (message: Message) => {
    readonly _tag: 'OnClick'
    readonly message: Message
  }
  OnClickFocus: (
    focusSelector: string,
    message: Message,
  ) => {
    readonly _tag: 'OnClickFocus'
    readonly focusSelector: string
    readonly message: Message
  }
  OnDoubleClick: (message: Message) => {
    readonly _tag: 'OnDoubleClick'
    readonly message: Message
  }
  OnMouseDown: (message: Message) => {
    readonly _tag: 'OnMouseDown'
    readonly message: Message
  }
  OnMouseUp: (message: Message) => {
    readonly _tag: 'OnMouseUp'
    readonly message: Message
  }
  OnMouseEnter: (message: Message) => {
    readonly _tag: 'OnMouseEnter'
    readonly message: Message
  }
  OnMouseLeave: (message: Message) => {
    readonly _tag: 'OnMouseLeave'
    readonly message: Message
  }
  OnMouseOver: (message: Message) => {
    readonly _tag: 'OnMouseOver'
    readonly message: Message
  }
  OnMouseOut: (message: Message) => {
    readonly _tag: 'OnMouseOut'
    readonly message: Message
  }
  OnMouseMove: (message: Message) => {
    readonly _tag: 'OnMouseMove'
    readonly message: Message
  }
  OnPointerMove: (
    f: (
      screenX: number,
      screenY: number,
      pointerType: string,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnPointerMove'
    readonly f: (
      screenX: number,
      screenY: number,
      pointerType: string,
    ) => Option.Option<Message>
  }
  OnPointerLeave: (f: (pointerType: string) => Option.Option<Message>) => {
    readonly _tag: 'OnPointerLeave'
    readonly f: (pointerType: string) => Option.Option<Message>
  }
  OnPointerDown: (
    f: (
      pointerType: string,
      button: number,
      screenX: number,
      screenY: number,
      timeStamp: number,
      clientX: number,
      clientY: number,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnPointerDown'
    readonly f: (
      pointerType: string,
      button: number,
      screenX: number,
      screenY: number,
      timeStamp: number,
      clientX: number,
      clientY: number,
    ) => Option.Option<Message>
  }
  OnPointerUp: (
    f: (
      screenX: number,
      screenY: number,
      pointerType: string,
      timeStamp: number,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnPointerUp'
    readonly f: (
      screenX: number,
      screenY: number,
      pointerType: string,
      timeStamp: number,
    ) => Option.Option<Message>
  }
  OnKeyDown: (f: (key: string, modifiers: KeyboardModifiers) => Message) => {
    readonly _tag: 'OnKeyDown'
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyDownPreventDefault: (
    f: (key: string, modifiers: KeyboardModifiers) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnKeyDownPreventDefault'
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyUp: (f: (key: string, modifiers: KeyboardModifiers) => Message) => {
    readonly _tag: 'OnKeyUp'
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyUpPreventDefault: (
    f: (key: string, modifiers: KeyboardModifiers) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnKeyUpPreventDefault'
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyPress: (f: (key: string, modifiers: KeyboardModifiers) => Message) => {
    readonly _tag: 'OnKeyPress'
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnFocus: (message: Message) => {
    readonly _tag: 'OnFocus'
    readonly message: Message
  }
  OnBlur: (message: Message) => {
    readonly _tag: 'OnBlur'
    readonly message: Message
  }
  OnInput: (f: (value: string) => Message) => {
    readonly _tag: 'OnInput'
    readonly f: (value: string) => Message
  }
  OnChange: (f: (value: string) => Message) => {
    readonly _tag: 'OnChange'
    readonly f: (value: string) => Message
  }
  OnFileChange: (f: (files: ReadonlyArray<File>) => Message) => {
    readonly _tag: 'OnFileChange'
    readonly f: (files: ReadonlyArray<File>) => Message
  }
  OnSubmit: (message: Message) => {
    readonly _tag: 'OnSubmit'
    readonly message: Message
  }
  OnReset: (message: Message) => {
    readonly _tag: 'OnReset'
    readonly message: Message
  }
  OnScroll: (f: (scrollTop: number) => Message) => {
    readonly _tag: 'OnScroll'
    readonly f: (scrollTop: number) => Message
  }
  OnWheel: (message: Message) => {
    readonly _tag: 'OnWheel'
    readonly message: Message
  }
  OnCopy: (message: Message) => {
    readonly _tag: 'OnCopy'
    readonly message: Message
  }
  OnCut: (message: Message) => {
    readonly _tag: 'OnCut'
    readonly message: Message
  }
  OnPaste: (message: Message) => {
    readonly _tag: 'OnPaste'
    readonly message: Message
  }
  OnCancel: (message: Message) => {
    readonly _tag: 'OnCancel'
    readonly message: Message
  }
  OnToggle: (f: (isOpen: boolean) => Message) => {
    readonly _tag: 'OnToggle'
    readonly f: (isOpen: boolean) => Message
  }
  OnContextMenu: (message: Message) => {
    readonly _tag: 'OnContextMenu'
    readonly message: Message
  }
  OnDragStart: (message: Message) => {
    readonly _tag: 'OnDragStart'
    readonly message: Message
  }
  OnDrag: (message: Message) => {
    readonly _tag: 'OnDrag'
    readonly message: Message
  }
  OnDragEnd: (message: Message) => {
    readonly _tag: 'OnDragEnd'
    readonly message: Message
  }
  OnDragEnter: (message: Message) => {
    readonly _tag: 'OnDragEnter'
    readonly message: Message
  }
  OnDragLeave: (message: Message) => {
    readonly _tag: 'OnDragLeave'
    readonly message: Message
  }
  OnDragOver: (message: Message) => {
    readonly _tag: 'OnDragOver'
    readonly message: Message
  }
  AllowDrop: () => { readonly _tag: 'AllowDrop' }
  OnDrop: (message: Message) => {
    readonly _tag: 'OnDrop'
    readonly message: Message
  }
  OnDropFiles: (f: (files: ReadonlyArray<File>) => Message) => {
    readonly _tag: 'OnDropFiles'
    readonly f: (files: ReadonlyArray<File>) => Message
  }
  OnTouchStart: (message: Message) => {
    readonly _tag: 'OnTouchStart'
    readonly message: Message
  }
  OnTouchEnd: (message: Message) => {
    readonly _tag: 'OnTouchEnd'
    readonly message: Message
  }
  OnTouchMove: (message: Message) => {
    readonly _tag: 'OnTouchMove'
    readonly message: Message
  }
  OnTouchCancel: (message: Message) => {
    readonly _tag: 'OnTouchCancel'
    readonly message: Message
  }
  OnAnimationStart: (message: Message) => {
    readonly _tag: 'OnAnimationStart'
    readonly message: Message
  }
  OnAnimationEnd: (message: Message) => {
    readonly _tag: 'OnAnimationEnd'
    readonly message: Message
  }
  OnAnimationIteration: (message: Message) => {
    readonly _tag: 'OnAnimationIteration'
    readonly message: Message
  }
  OnTransitionEnd: (message: Message) => {
    readonly _tag: 'OnTransitionEnd'
    readonly message: Message
  }
  OnLoad: (message: Message) => {
    readonly _tag: 'OnLoad'
    readonly message: Message
  }
  OnError: (message: Message) => {
    readonly _tag: 'OnError'
    readonly message: Message
  }
  OnPlay: (message: Message) => {
    readonly _tag: 'OnPlay'
    readonly message: Message
  }
  OnPause: (message: Message) => {
    readonly _tag: 'OnPause'
    readonly message: Message
  }
  OnEnded: (message: Message) => {
    readonly _tag: 'OnEnded'
    readonly message: Message
  }
  OnTimeUpdate: (message: Message) => {
    readonly _tag: 'OnTimeUpdate'
    readonly message: Message
  }
  OnVolumeChange: (message: Message) => {
    readonly _tag: 'OnVolumeChange'
    readonly message: Message
  }
  OnSelect: (message: Message) => {
    readonly _tag: 'OnSelect'
    readonly message: Message
  }
  Value: (value: string) => { readonly _tag: 'Value'; readonly value: string }
  Checked: (value: boolean) => {
    readonly _tag: 'Checked'
    readonly value: boolean
  }
  Selected: (value: boolean) => {
    readonly _tag: 'Selected'
    readonly value: boolean
  }
  Open: (value: boolean) => { readonly _tag: 'Open'; readonly value: boolean }
  Placeholder: (value: string) => {
    readonly _tag: 'Placeholder'
    readonly value: string
  }
  Name: (value: string) => { readonly _tag: 'Name'; readonly value: string }
  Disabled: (value: boolean) => {
    readonly _tag: 'Disabled'
    readonly value: boolean
  }
  Readonly: (value: boolean) => {
    readonly _tag: 'Readonly'
    readonly value: boolean
  }
  Required: (value: boolean) => {
    readonly _tag: 'Required'
    readonly value: boolean
  }
  Autofocus: (value: boolean) => {
    readonly _tag: 'Autofocus'
    readonly value: boolean
  }
  Spellcheck: (value: boolean) => {
    readonly _tag: 'Spellcheck'
    readonly value: boolean
  }
  Autocorrect: (value: string) => {
    readonly _tag: 'Autocorrect'
    readonly value: string
  }
  Autocapitalize: (value: string) => {
    readonly _tag: 'Autocapitalize'
    readonly value: string
  }
  InputMode: (value: string) => {
    readonly _tag: 'InputMode'
    readonly value: string
  }
  EnterKeyHint: (value: string) => {
    readonly _tag: 'EnterKeyHint'
    readonly value: string
  }
  Multiple: (value: boolean) => {
    readonly _tag: 'Multiple'
    readonly value: boolean
  }
  Type: (value: string) => { readonly _tag: 'Type'; readonly value: string }
  Accept: (value: string) => { readonly _tag: 'Accept'; readonly value: string }
  Autocomplete: (value: string) => {
    readonly _tag: 'Autocomplete'
    readonly value: string
  }
  Pattern: (value: string) => {
    readonly _tag: 'Pattern'
    readonly value: string
  }
  Maxlength: (value: number) => {
    readonly _tag: 'Maxlength'
    readonly value: number
  }
  Minlength: (value: number) => {
    readonly _tag: 'Minlength'
    readonly value: number
  }
  Size: (value: number) => { readonly _tag: 'Size'; readonly value: number }
  Cols: (value: number) => { readonly _tag: 'Cols'; readonly value: number }
  Rows: (value: number) => { readonly _tag: 'Rows'; readonly value: number }
  Max: (value: string) => { readonly _tag: 'Max'; readonly value: string }
  Min: (value: string) => { readonly _tag: 'Min'; readonly value: string }
  Step: (value: string) => { readonly _tag: 'Step'; readonly value: string }
  For: (value: string) => { readonly _tag: 'For'; readonly value: string }
  Href: (value: string) => { readonly _tag: 'Href'; readonly value: string }
  Src: (value: string) => { readonly _tag: 'Src'; readonly value: string }
  Alt: (value: string) => { readonly _tag: 'Alt'; readonly value: string }
  Target: (value: string) => { readonly _tag: 'Target'; readonly value: string }
  Rel: (value: string) => { readonly _tag: 'Rel'; readonly value: string }
  Download: (value: string) => {
    readonly _tag: 'Download'
    readonly value: string
  }
  Action: (value: string) => { readonly _tag: 'Action'; readonly value: string }
  Method: (value: string) => { readonly _tag: 'Method'; readonly value: string }
  Enctype: (value: string) => {
    readonly _tag: 'Enctype'
    readonly value: string
  }
  Novalidate: (value: boolean) => {
    readonly _tag: 'Novalidate'
    readonly value: boolean
  }
  Formaction: (value: string) => {
    readonly _tag: 'Formaction'
    readonly value: string
  }
  Formmethod: (value: string) => {
    readonly _tag: 'Formmethod'
    readonly value: string
  }
  Formnovalidate: (value: boolean) => {
    readonly _tag: 'Formnovalidate'
    readonly value: boolean
  }
  Formtarget: (value: string) => {
    readonly _tag: 'Formtarget'
    readonly value: string
  }
  Formenctype: (value: string) => {
    readonly _tag: 'Formenctype'
    readonly value: string
  }
  Colspan: (value: number) => {
    readonly _tag: 'Colspan'
    readonly value: number
  }
  Rowspan: (value: number) => {
    readonly _tag: 'Rowspan'
    readonly value: number
  }
  Scope: (value: string) => {
    readonly _tag: 'Scope'
    readonly value: string
  }
  Headers: (value: string) => {
    readonly _tag: 'Headers'
    readonly value: string
  }
  Span: (value: number) => { readonly _tag: 'Span'; readonly value: number }
  Start: (value: number) => { readonly _tag: 'Start'; readonly value: number }
  Reversed: (value: boolean) => {
    readonly _tag: 'Reversed'
    readonly value: boolean
  }
  CiteAttr: (value: string) => {
    readonly _tag: 'CiteAttr'
    readonly value: string
  }
  Datetime: (value: string) => {
    readonly _tag: 'Datetime'
    readonly value: string
  }
  Wrap: (value: string) => { readonly _tag: 'Wrap'; readonly value: string }
  List: (value: string) => { readonly _tag: 'List'; readonly value: string }
  FormAttr: (value: string) => {
    readonly _tag: 'FormAttr'
    readonly value: string
  }
  LabelAttr: (value: string) => {
    readonly _tag: 'LabelAttr'
    readonly value: string
  }
  ContentAttr: (value: string) => {
    readonly _tag: 'ContentAttr'
    readonly value: string
  }
  Charset: (value: string) => {
    readonly _tag: 'Charset'
    readonly value: string
  }
  HttpEquiv: (value: string) => {
    readonly _tag: 'HttpEquiv'
    readonly value: string
  }
  Srcset: (value: string) => {
    readonly _tag: 'Srcset'
    readonly value: string
  }
  Sizes: (value: string) => { readonly _tag: 'Sizes'; readonly value: string }
  Loading: (value: string) => {
    readonly _tag: 'Loading'
    readonly value: string
  }
  Decoding: (value: string) => {
    readonly _tag: 'Decoding'
    readonly value: string
  }
  Fetchpriority: (value: string) => {
    readonly _tag: 'Fetchpriority'
    readonly value: string
  }
  Crossorigin: (value: string) => {
    readonly _tag: 'Crossorigin'
    readonly value: string
  }
  Referrerpolicy: (value: string) => {
    readonly _tag: 'Referrerpolicy'
    readonly value: string
  }
  Integrity: (value: string) => {
    readonly _tag: 'Integrity'
    readonly value: string
  }
  Hreflang: (value: string) => {
    readonly _tag: 'Hreflang'
    readonly value: string
  }
  Ping: (value: string) => { readonly _tag: 'Ping'; readonly value: string }
  Sandbox: (value: string) => {
    readonly _tag: 'Sandbox'
    readonly value: string
  }
  Allow: (value: string) => { readonly _tag: 'Allow'; readonly value: string }
  Srcdoc: (value: string) => {
    readonly _tag: 'Srcdoc'
    readonly value: string
  }
  Autoplay: (value: boolean) => {
    readonly _tag: 'Autoplay'
    readonly value: boolean
  }
  Controls: (value: boolean) => {
    readonly _tag: 'Controls'
    readonly value: boolean
  }
  Loop: (value: boolean) => { readonly _tag: 'Loop'; readonly value: boolean }
  Muted: (value: boolean) => {
    readonly _tag: 'Muted'
    readonly value: boolean
  }
  Poster: (value: string) => {
    readonly _tag: 'Poster'
    readonly value: string
  }
  Preload: (value: string) => {
    readonly _tag: 'Preload'
    readonly value: string
  }
  Playsinline: (value: boolean) => {
    readonly _tag: 'Playsinline'
    readonly value: boolean
  }
  High: (value: number) => { readonly _tag: 'High'; readonly value: number }
  Low: (value: number) => { readonly _tag: 'Low'; readonly value: number }
  Optimum: (value: number) => {
    readonly _tag: 'Optimum'
    readonly value: number
  }
  Usemap: (value: string) => {
    readonly _tag: 'Usemap'
    readonly value: string
  }
  Ismap: (value: boolean) => {
    readonly _tag: 'Ismap'
    readonly value: boolean
  }
  Role: (value: string) => { readonly _tag: 'Role'; readonly value: string }
  AriaLabel: (value: string) => {
    readonly _tag: 'AriaLabel'
    readonly value: string
  }
  AriaLabelledBy: (value: string) => {
    readonly _tag: 'AriaLabelledBy'
    readonly value: string
  }
  AriaDescribedBy: (value: string) => {
    readonly _tag: 'AriaDescribedBy'
    readonly value: string
  }
  AriaHidden: (value: boolean) => {
    readonly _tag: 'AriaHidden'
    readonly value: boolean
  }
  AriaExpanded: (value: boolean) => {
    readonly _tag: 'AriaExpanded'
    readonly value: boolean
  }
  AriaSelected: (value: boolean) => {
    readonly _tag: 'AriaSelected'
    readonly value: boolean
  }
  AriaChecked: (value: boolean | 'mixed') => {
    readonly _tag: 'AriaChecked'
    readonly value: boolean | 'mixed'
  }
  AriaDisabled: (value: boolean) => {
    readonly _tag: 'AriaDisabled'
    readonly value: boolean
  }
  AriaRequired: (value: boolean) => {
    readonly _tag: 'AriaRequired'
    readonly value: boolean
  }
  AriaInvalid: (value: boolean) => {
    readonly _tag: 'AriaInvalid'
    readonly value: boolean
  }
  AriaLive: (value: string) => {
    readonly _tag: 'AriaLive'
    readonly value: string
  }
  AriaControls: (value: string) => {
    readonly _tag: 'AriaControls'
    readonly value: string
  }
  AriaCurrent: (value: string) => {
    readonly _tag: 'AriaCurrent'
    readonly value: string
  }
  AriaOrientation: (value: string) => {
    readonly _tag: 'AriaOrientation'
    readonly value: string
  }
  AriaPressed: (value: string) => {
    readonly _tag: 'AriaPressed'
    readonly value: string
  }
  AriaHasPopup: (value: string) => {
    readonly _tag: 'AriaHasPopup'
    readonly value: string
  }
  AriaActiveDescendant: (value: string) => {
    readonly _tag: 'AriaActiveDescendant'
    readonly value: string
  }
  AriaSort: (value: string) => {
    readonly _tag: 'AriaSort'
    readonly value: string
  }
  AriaMultiSelectable: (value: boolean) => {
    readonly _tag: 'AriaMultiSelectable'
    readonly value: boolean
  }
  AriaModal: (value: boolean) => {
    readonly _tag: 'AriaModal'
    readonly value: boolean
  }
  AriaBusy: (value: boolean) => {
    readonly _tag: 'AriaBusy'
    readonly value: boolean
  }
  AriaErrorMessage: (value: string) => {
    readonly _tag: 'AriaErrorMessage'
    readonly value: string
  }
  AriaRoleDescription: (value: string) => {
    readonly _tag: 'AriaRoleDescription'
    readonly value: string
  }
  AriaAtomic: (value: boolean) => {
    readonly _tag: 'AriaAtomic'
    readonly value: boolean
  }
  AriaAutocomplete: (value: string) => {
    readonly _tag: 'AriaAutocomplete'
    readonly value: string
  }
  AriaColcount: (value: number) => {
    readonly _tag: 'AriaColcount'
    readonly value: number
  }
  AriaColindex: (value: number) => {
    readonly _tag: 'AriaColindex'
    readonly value: number
  }
  AriaColspan: (value: number) => {
    readonly _tag: 'AriaColspan'
    readonly value: number
  }
  AriaDescription: (value: string) => {
    readonly _tag: 'AriaDescription'
    readonly value: string
  }
  AriaDetails: (value: string) => {
    readonly _tag: 'AriaDetails'
    readonly value: string
  }
  AriaFlowto: (value: string) => {
    readonly _tag: 'AriaFlowto'
    readonly value: string
  }
  AriaKeyshortcuts: (value: string) => {
    readonly _tag: 'AriaKeyshortcuts'
    readonly value: string
  }
  AriaLevel: (value: number) => {
    readonly _tag: 'AriaLevel'
    readonly value: number
  }
  AriaOwns: (value: string) => {
    readonly _tag: 'AriaOwns'
    readonly value: string
  }
  AriaPlaceholder: (value: string) => {
    readonly _tag: 'AriaPlaceholder'
    readonly value: string
  }
  AriaPosinset: (value: number) => {
    readonly _tag: 'AriaPosinset'
    readonly value: number
  }
  AriaReadonly: (value: boolean) => {
    readonly _tag: 'AriaReadonly'
    readonly value: boolean
  }
  AriaRelevant: (value: string) => {
    readonly _tag: 'AriaRelevant'
    readonly value: string
  }
  AriaRowcount: (value: number) => {
    readonly _tag: 'AriaRowcount'
    readonly value: number
  }
  AriaRowindex: (value: number) => {
    readonly _tag: 'AriaRowindex'
    readonly value: number
  }
  AriaRowspan: (value: number) => {
    readonly _tag: 'AriaRowspan'
    readonly value: number
  }
  AriaSetsize: (value: number) => {
    readonly _tag: 'AriaSetsize'
    readonly value: number
  }
  AriaValuemax: (value: number) => {
    readonly _tag: 'AriaValuemax'
    readonly value: number
  }
  AriaValuemin: (value: number) => {
    readonly _tag: 'AriaValuemin'
    readonly value: number
  }
  AriaValuenow: (value: number) => {
    readonly _tag: 'AriaValuenow'
    readonly value: number
  }
  AriaValuetext: (value: string) => {
    readonly _tag: 'AriaValuetext'
    readonly value: string
  }
  Attribute: (
    key: string,
    value: string,
  ) => {
    readonly _tag: 'Attribute'
    readonly key: string
    readonly value: string
  }
  DataAttribute: (
    key: string,
    value: string,
  ) => {
    readonly _tag: 'DataAttribute'
    readonly key: string
    readonly value: string
  }
  Style: (value: Record<string, string>) => {
    readonly _tag: 'Style'
    readonly value: Record<string, string>
  }
  InnerHTML: (value: string) => {
    readonly _tag: 'InnerHTML'
    readonly value: string
  }
  ViewBox: (value: string) => {
    readonly _tag: 'ViewBox'
    readonly value: string
  }
  Xmlns: (value: string) => { readonly _tag: 'Xmlns'; readonly value: string }
  Fill: (value: string) => { readonly _tag: 'Fill'; readonly value: string }
  FillRule: (value: string) => {
    readonly _tag: 'FillRule'
    readonly value: string
  }
  ClipRule: (value: string) => {
    readonly _tag: 'ClipRule'
    readonly value: string
  }
  Stroke: (value: string) => { readonly _tag: 'Stroke'; readonly value: string }
  StrokeWidth: (value: string) => {
    readonly _tag: 'StrokeWidth'
    readonly value: string
  }
  StrokeLinecap: (value: string) => {
    readonly _tag: 'StrokeLinecap'
    readonly value: string
  }
  StrokeLinejoin: (value: string) => {
    readonly _tag: 'StrokeLinejoin'
    readonly value: string
  }
  D: (value: string) => { readonly _tag: 'D'; readonly value: string }
  Cx: (value: string) => { readonly _tag: 'Cx'; readonly value: string }
  Cy: (value: string) => { readonly _tag: 'Cy'; readonly value: string }
  R: (value: string) => { readonly _tag: 'R'; readonly value: string }
  X: (value: string) => { readonly _tag: 'X'; readonly value: string }
  Y: (value: string) => { readonly _tag: 'Y'; readonly value: string }
  Width: (value: string) => { readonly _tag: 'Width'; readonly value: string }
  Height: (value: string) => { readonly _tag: 'Height'; readonly value: string }
  X1: (value: string) => { readonly _tag: 'X1'; readonly value: string }
  Y1: (value: string) => { readonly _tag: 'Y1'; readonly value: string }
  X2: (value: string) => { readonly _tag: 'X2'; readonly value: string }
  Y2: (value: string) => { readonly _tag: 'Y2'; readonly value: string }
  Points: (value: string) => { readonly _tag: 'Points'; readonly value: string }
  Transform: (value: string) => {
    readonly _tag: 'Transform'
    readonly value: string
  }
  Opacity: (value: string) => {
    readonly _tag: 'Opacity'
    readonly value: string
  }
  StrokeDasharray: (value: string) => {
    readonly _tag: 'StrokeDasharray'
    readonly value: string
  }
  StrokeDashoffset: (value: string) => {
    readonly _tag: 'StrokeDashoffset'
    readonly value: string
  }
  OnMount: (action: MountAction<Message, any>) => {
    readonly _tag: 'OnMount'
    readonly action: MountAction<Message, any>
  }
}

const htmlAttributes = <Message>(): HtmlAttributes<Message> => ({
  Key: (value: string) => Key({ value }),
  Class: (value: string) => Class({ value }),
  Id: (value: string) => Id({ value }),
  Title: (value: string) => Title({ value }),
  Lang: (value: string) => Lang({ value }),
  Dir: (value: string) => Dir({ value }),
  Tabindex: (value: number) => Tabindex({ value }),
  Hidden: (value: boolean) => Hidden({ value }),
  Contenteditable: (value: string) => Contenteditable({ value }),
  Draggable: (value: boolean) => Draggable({ value }),
  Accesskey: (value: string) => Accesskey({ value }),
  Translate: (value: string) => Translate({ value }),
  Inert: (value: boolean) => Inert({ value }),
  Popover: (value: string) => Popover({ value }),
  Popovertarget: (value: string) => Popovertarget({ value }),
  Popovertargetaction: (value: string) => Popovertargetaction({ value }),
  OnClick: (message: Message) => OnClick({ message }),
  /**
   * Click handler that synchronously focuses the element matching
   * `focusSelector`, then dispatches `message`. Both run inside the originating
   * click event handler, preserving the user-gesture context.
   *
   * Use this when tapping the element must open the on-screen keyboard on
   * iOS Safari. Safari only opens the keyboard if `.focus()` runs synchronously
   * inside the originating user-gesture handler, which a Command's `Dom.focus`
   * cannot satisfy (Commands fork through `Effect.forkDetach` +
   * `requestAnimationFrame` and resolve after the gesture has expired).
   *
   * When the real input only mounts later (a search field inside a dialog,
   * say), focus it in two steps. First, keep a focusable text input that is
   * always in the DOM (a visually hidden "keyboard warmup") and point
   * `focusSelector` at it, so the tap focuses the input (which opens the
   * keyboard) and dispatches a Message. Second, update's branch for that
   * Message opens the dialog and returns a `Dom.focus` Command pointed at the
   * real input; by the time it runs the input has mounted, so focus moves to
   * it. iOS keeps the keyboard up when focus moves between two text inputs,
   * so it stays open and now targets the real input.
   *
   * Like `OnKeyDownPreventDefault`, the side effect (focusing another
   * element) lives inside the framework's event handler so user code stays
   * declarative.
   *
   * @example
   * ```typescript
   * h.OnClickFocus('#search-keyboard-warmup', ClickedSearch())
   * ```
   */
  OnClickFocus: (focusSelector: string, message: Message) =>
    OnClickFocus({ focusSelector, message }),
  OnDoubleClick: (message: Message) => OnDoubleClick({ message }),
  OnMouseDown: (message: Message) => OnMouseDown({ message }),
  OnMouseUp: (message: Message) => OnMouseUp({ message }),
  OnMouseEnter: (message: Message) => OnMouseEnter({ message }),
  OnMouseLeave: (message: Message) => OnMouseLeave({ message }),
  OnMouseOver: (message: Message) => OnMouseOver({ message }),
  OnMouseOut: (message: Message) => OnMouseOut({ message }),
  OnMouseMove: (message: Message) => OnMouseMove({ message }),
  OnPointerMove: (
    f: (
      screenX: number,
      screenY: number,
      pointerType: string,
    ) => Option.Option<Message>,
  ) => OnPointerMove({ f }),
  OnPointerLeave: (f: (pointerType: string) => Option.Option<Message>) =>
    OnPointerLeave({ f }),
  OnPointerDown: (
    f: (
      pointerType: string,
      button: number,
      screenX: number,
      screenY: number,
      timeStamp: number,
      clientX: number,
      clientY: number,
    ) => Option.Option<Message>,
  ) => OnPointerDown({ f }),
  OnPointerUp: (
    f: (
      screenX: number,
      screenY: number,
      pointerType: string,
      timeStamp: number,
    ) => Option.Option<Message>,
  ) => OnPointerUp({ f }),
  OnKeyDown: (f: (key: string, modifiers: KeyboardModifiers) => Message) =>
    OnKeyDown({ f }),
  OnKeyDownPreventDefault: (
    f: (key: string, modifiers: KeyboardModifiers) => Option.Option<Message>,
  ) => OnKeyDownPreventDefault({ f }),
  OnKeyUp: (f: (key: string, modifiers: KeyboardModifiers) => Message) =>
    OnKeyUp({ f }),
  OnKeyUpPreventDefault: (
    f: (key: string, modifiers: KeyboardModifiers) => Option.Option<Message>,
  ) => OnKeyUpPreventDefault({ f }),
  OnKeyPress: (f: (key: string, modifiers: KeyboardModifiers) => Message) =>
    OnKeyPress({ f }),
  OnFocus: (message: Message) => OnFocus({ message }),
  OnBlur: (message: Message) => OnBlur({ message }),
  OnInput: (f: (value: string) => Message) => OnInput({ f }),
  OnChange: (f: (value: string) => Message) => OnChange({ f }),
  OnFileChange: (f: (files: ReadonlyArray<File>) => Message) =>
    OnFileChange({ f }),
  OnSubmit: (message: Message) => OnSubmit({ message }),
  OnReset: (message: Message) => OnReset({ message }),
  OnScroll: (f: (scrollTop: number) => Message) => OnScroll({ f }),
  OnWheel: (message: Message) => OnWheel({ message }),
  OnCopy: (message: Message) => OnCopy({ message }),
  OnCut: (message: Message) => OnCut({ message }),
  OnPaste: (message: Message) => OnPaste({ message }),
  OnCancel: (message: Message) => OnCancel({ message }),
  OnToggle: (f: (isOpen: boolean) => Message) => OnToggle({ f }),
  OnContextMenu: (message: Message) => OnContextMenu({ message }),
  OnDragStart: (message: Message) => OnDragStart({ message }),
  OnDrag: (message: Message) => OnDrag({ message }),
  OnDragEnd: (message: Message) => OnDragEnd({ message }),
  OnDragEnter: (message: Message) => OnDragEnter({ message }),
  OnDragLeave: (message: Message) => OnDragLeave({ message }),
  OnDragOver: (message: Message) => OnDragOver({ message }),
  AllowDrop: () => AllowDrop(),
  OnDrop: (message: Message) => OnDrop({ message }),
  OnDropFiles: (f: (files: ReadonlyArray<File>) => Message) =>
    OnDropFiles({ f }),
  OnTouchStart: (message: Message) => OnTouchStart({ message }),
  OnTouchEnd: (message: Message) => OnTouchEnd({ message }),
  OnTouchMove: (message: Message) => OnTouchMove({ message }),
  OnTouchCancel: (message: Message) => OnTouchCancel({ message }),
  OnAnimationStart: (message: Message) => OnAnimationStart({ message }),
  OnAnimationEnd: (message: Message) => OnAnimationEnd({ message }),
  OnAnimationIteration: (message: Message) => OnAnimationIteration({ message }),
  OnTransitionEnd: (message: Message) => OnTransitionEnd({ message }),
  OnLoad: (message: Message) => OnLoad({ message }),
  OnError: (message: Message) => OnError({ message }),
  OnPlay: (message: Message) => OnPlay({ message }),
  OnPause: (message: Message) => OnPause({ message }),
  OnEnded: (message: Message) => OnEnded({ message }),
  OnTimeUpdate: (message: Message) => OnTimeUpdate({ message }),
  OnVolumeChange: (message: Message) => OnVolumeChange({ message }),
  OnSelect: (message: Message) => OnSelect({ message }),
  Value: (value: string) => Value({ value }),
  Checked: (value: boolean) => Checked({ value }),
  Selected: (value: boolean) => Selected({ value }),
  Open: (value: boolean) => Open({ value }),
  Placeholder: (value: string) => Placeholder({ value }),
  Name: (value: string) => Name({ value }),
  Disabled: (value: boolean) => Disabled({ value }),
  Readonly: (value: boolean) => Readonly({ value }),
  Required: (value: boolean) => Required({ value }),
  Autofocus: (value: boolean) => Autofocus({ value }),
  Spellcheck: (value: boolean) => Spellcheck({ value }),
  Autocorrect: (value: string) => Autocorrect({ value }),
  Autocapitalize: (value: string) => Autocapitalize({ value }),
  InputMode: (value: string) => InputMode({ value }),
  EnterKeyHint: (value: string) => EnterKeyHint({ value }),
  Multiple: (value: boolean) => Multiple({ value }),
  Type: (value: string) => Type({ value }),
  Accept: (value: string) => Accept({ value }),
  Autocomplete: (value: string) => Autocomplete({ value }),
  Pattern: (value: string) => Pattern({ value }),
  Maxlength: (value: number) => Maxlength({ value }),
  Minlength: (value: number) => Minlength({ value }),
  Size: (value: number) => Size({ value }),
  Cols: (value: number) => Cols({ value }),
  Rows: (value: number) => Rows({ value }),
  Max: (value: string) => Max({ value }),
  Min: (value: string) => Min({ value }),
  Step: (value: string) => Step({ value }),
  For: (value: string) => For({ value }),
  Href: (value: string) => Href({ value }),
  Src: (value: string) => Src({ value }),
  Alt: (value: string) => Alt({ value }),
  Target: (value: string) => Target({ value }),
  Rel: (value: string) => Rel({ value }),
  Download: (value: string) => Download({ value }),
  Action: (value: string) => Action({ value }),
  Method: (value: string) => Method({ value }),
  Enctype: (value: string) => Enctype({ value }),
  Novalidate: (value: boolean) => Novalidate({ value }),
  Formaction: (value: string) => Formaction({ value }),
  Formmethod: (value: string) => Formmethod({ value }),
  Formnovalidate: (value: boolean) => Formnovalidate({ value }),
  Formtarget: (value: string) => Formtarget({ value }),
  Formenctype: (value: string) => Formenctype({ value }),
  Colspan: (value: number) => Colspan({ value }),
  Rowspan: (value: number) => Rowspan({ value }),
  Scope: (value: string) => Scope({ value }),
  Headers: (value: string) => Headers({ value }),
  Span: (value: number) => Span({ value }),
  Start: (value: number) => Start({ value }),
  Reversed: (value: boolean) => Reversed({ value }),
  CiteAttr: (value: string) => CiteAttr({ value }),
  Datetime: (value: string) => Datetime({ value }),
  Wrap: (value: string) => Wrap({ value }),
  List: (value: string) => List({ value }),
  FormAttr: (value: string) => FormAttr({ value }),
  LabelAttr: (value: string) => LabelAttr({ value }),
  ContentAttr: (value: string) => ContentAttr({ value }),
  Charset: (value: string) => Charset({ value }),
  HttpEquiv: (value: string) => HttpEquiv({ value }),
  Srcset: (value: string) => Srcset({ value }),
  Sizes: (value: string) => Sizes({ value }),
  Loading: (value: string) => Loading({ value }),
  Decoding: (value: string) => Decoding({ value }),
  Fetchpriority: (value: string) => Fetchpriority({ value }),
  Crossorigin: (value: string) => Crossorigin({ value }),
  Referrerpolicy: (value: string) => Referrerpolicy({ value }),
  Integrity: (value: string) => Integrity({ value }),
  Hreflang: (value: string) => Hreflang({ value }),
  Ping: (value: string) => Ping({ value }),
  Sandbox: (value: string) => Sandbox({ value }),
  Allow: (value: string) => Allow({ value }),
  Srcdoc: (value: string) => Srcdoc({ value }),
  Autoplay: (value: boolean) => Autoplay({ value }),
  Controls: (value: boolean) => Controls({ value }),
  Loop: (value: boolean) => Loop({ value }),
  Muted: (value: boolean) => Muted({ value }),
  Poster: (value: string) => Poster({ value }),
  Preload: (value: string) => Preload({ value }),
  Playsinline: (value: boolean) => Playsinline({ value }),
  High: (value: number) => High({ value }),
  Low: (value: number) => Low({ value }),
  Optimum: (value: number) => Optimum({ value }),
  Usemap: (value: string) => Usemap({ value }),
  Ismap: (value: boolean) => Ismap({ value }),
  Role: (value: string) => Role({ value }),
  AriaLabel: (value: string) => AriaLabel({ value }),
  AriaLabelledBy: (value: string) => AriaLabelledBy({ value }),
  AriaDescribedBy: (value: string) => AriaDescribedBy({ value }),
  AriaHidden: (value: boolean) => AriaHidden({ value }),
  AriaExpanded: (value: boolean) => AriaExpanded({ value }),
  AriaSelected: (value: boolean) => AriaSelected({ value }),
  AriaChecked: (value: boolean | 'mixed') => AriaChecked({ value }),
  AriaDisabled: (value: boolean) => AriaDisabled({ value }),
  AriaRequired: (value: boolean) => AriaRequired({ value }),
  AriaInvalid: (value: boolean) => AriaInvalid({ value }),
  AriaLive: (value: string) => AriaLive({ value }),
  AriaControls: (value: string) => AriaControls({ value }),
  AriaCurrent: (value: string) => AriaCurrent({ value }),
  AriaOrientation: (value: string) => AriaOrientation({ value }),
  AriaPressed: (value: string) => AriaPressed({ value }),
  AriaHasPopup: (value: string) => AriaHasPopup({ value }),
  AriaActiveDescendant: (value: string) => AriaActiveDescendant({ value }),
  AriaSort: (value: string) => AriaSort({ value }),
  AriaMultiSelectable: (value: boolean) => AriaMultiSelectable({ value }),
  AriaModal: (value: boolean) => AriaModal({ value }),
  AriaBusy: (value: boolean) => AriaBusy({ value }),
  AriaErrorMessage: (value: string) => AriaErrorMessage({ value }),
  AriaRoleDescription: (value: string) => AriaRoleDescription({ value }),
  AriaAtomic: (value: boolean) => AriaAtomic({ value }),
  AriaAutocomplete: (value: string) => AriaAutocomplete({ value }),
  AriaColcount: (value: number) => AriaColcount({ value }),
  AriaColindex: (value: number) => AriaColindex({ value }),
  AriaColspan: (value: number) => AriaColspan({ value }),
  AriaDescription: (value: string) => AriaDescription({ value }),
  AriaDetails: (value: string) => AriaDetails({ value }),
  AriaFlowto: (value: string) => AriaFlowto({ value }),
  AriaKeyshortcuts: (value: string) => AriaKeyshortcuts({ value }),
  AriaLevel: (value: number) => AriaLevel({ value }),
  AriaOwns: (value: string) => AriaOwns({ value }),
  AriaPlaceholder: (value: string) => AriaPlaceholder({ value }),
  AriaPosinset: (value: number) => AriaPosinset({ value }),
  AriaReadonly: (value: boolean) => AriaReadonly({ value }),
  AriaRelevant: (value: string) => AriaRelevant({ value }),
  AriaRowcount: (value: number) => AriaRowcount({ value }),
  AriaRowindex: (value: number) => AriaRowindex({ value }),
  AriaRowspan: (value: number) => AriaRowspan({ value }),
  AriaSetsize: (value: number) => AriaSetsize({ value }),
  AriaValuemax: (value: number) => AriaValuemax({ value }),
  AriaValuemin: (value: number) => AriaValuemin({ value }),
  AriaValuenow: (value: number) => AriaValuenow({ value }),
  AriaValuetext: (value: string) => AriaValuetext({ value }),
  Attribute: (key: string, value: string) => Attribute({ key, value }),
  DataAttribute: (key: string, value: string) => DataAttribute({ key, value }),
  Style: (value: Record<string, string>) => Style({ value }),
  InnerHTML: (value: string) => InnerHTML({ value }),
  ViewBox: (value: string) => ViewBox({ value }),
  Xmlns: (value: string) => Xmlns({ value }),
  Fill: (value: string) => Fill({ value }),
  FillRule: (value: string) => FillRule({ value }),
  ClipRule: (value: string) => ClipRule({ value }),
  Stroke: (value: string) => Stroke({ value }),
  StrokeWidth: (value: string) => StrokeWidth({ value }),
  StrokeLinecap: (value: string) => StrokeLinecap({ value }),
  StrokeLinejoin: (value: string) => StrokeLinejoin({ value }),
  D: (value: string) => D({ value }),
  Cx: (value: string) => Cx({ value }),
  Cy: (value: string) => Cy({ value }),
  R: (value: string) => R({ value }),
  X: (value: string) => X({ value }),
  Y: (value: string) => Y({ value }),
  Width: (value: string) => Width({ value }),
  Height: (value: string) => Height({ value }),
  X1: (value: string) => X1({ value }),
  Y1: (value: string) => Y1({ value }),
  X2: (value: string) => X2({ value }),
  Y2: (value: string) => Y2({ value }),
  Points: (value: string) => Points({ value }),
  Transform: (value: string) => Transform({ value }),
  Opacity: (value: string) => Opacity({ value }),
  StrokeDasharray: (value: string) => StrokeDasharray({ value }),
  StrokeDashoffset: (value: string) => StrokeDashoffset({ value }),
  OnMount: (action: MountAction<Message, any>) => OnMount({ action }),
})

const buildHtmlFactory = <Message>() => ({
  ...htmlElements<Message>(),
  ...htmlAttributes<Message>(),
  empty: null,
  keyed: keyed<Message>(),
  submodel,
})

const cachedHtmlFactory = buildHtmlFactory<unknown>()

/**
 * Returns all HTML, SVG, and MathML element constructors, attribute
 * constructors, a `keyed` helper for keyed elements, and `empty` for
 * rendering nothing.
 *
 * The returned object is a process-wide singleton. The `Message` type
 * parameter is erased at runtime, and the element and attribute constructors
 * carry no per-program state (dispatch is read from the runtime singleton at
 * call time), so calling `html()` repeatedly from inside view functions does
 * not allocate a fresh object.
 */
export const html = <Message = never>(): ReturnType<
  typeof buildHtmlFactory<Message>
> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  cachedHtmlFactory as ReturnType<typeof buildHtmlFactory<Message>>
