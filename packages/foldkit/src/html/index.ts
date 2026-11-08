import {
  Array,
  Context,
  Data,
  Effect,
  Fiber,
  Function,
  Option,
  Predicate,
  Record,
  Schema,
  Stream,
} from 'effect'

import {
  type DefinitionIdentity,
  InvocationIdentityTypeId,
  InvocationNameTypeId,
  type ViewScope,
  ViewScopeTypeId,
  identityOf,
  invocationIdentity,
  invocationName,
  ownerOfInvocation,
} from '../block/identity.js'
import {
  type ActiveInstance,
  CurrentInstance,
} from '../block/instanceContext.js'
import {
  restoreUncontrolledContent,
  synchronizeControlledDefault,
} from '../controlledDomState.js'
import {
  FOREIGN_REPRESENTABLE_PROPERTIES,
  assertStyleIsRepresentable,
  htmlAttributeValue,
  isHtmlPropertyRepresentable,
  normalizedStyleProperties,
  reflectedAttributeName,
} from '../domReflection.js'
import type { File } from '../file/index.js'
import { isImeCompositionKeydown } from '../imeComposition.js'
import {
  type AnyMountHandler,
  type MountAction,
  type MountRegistration,
  MountRegistrationTypeId,
  MountRuntime,
  MountTracker,
  liveViewStateChanges,
} from '../mount/index.js'
import { cleanupMount, registerMountCleanup } from '../mountModule.js'
import {
  attachOnUnmount,
  beginReplayUnmountRender,
  endReplayUnmountRender,
  flushReplayUnmountsAfterPatchFailure,
} from '../onUnmountModule.js'
import {
  hasTrustedInnerHtml,
  isClientOnlyProperty,
  markClientOnlyProperty,
  markTrustedInnerHtml,
  unmarkClientOnlyProperty,
} from '../propertyProvenance.js'
import {
  type On,
  type VNodeData,
  VNodeDataMask,
  h,
  vnodeDataMaskKey,
} from '../snabbdom/index.js'
import { tagNameFromSelector } from '../tagName.js'
import { VNode } from '../vdom.js'
import {
  type AnyBlockView,
  type BlockConfig,
  type ViewMountRequirementsOf,
  block,
} from './block.js'
import { type ChildAttribute, isChildAttribute } from './childAttribute.js'
import {
  checkScheduledLeave,
  clearDragZoneAfterDrop,
  getDragZoneState,
  processDragEnter,
  processDragLeave,
} from './dragZoneTracking.js'
import { captureMount } from './mountCapture.js'
import {
  type DispatchSync,
  type MountDispatchResolver,
  type MountRenderOwner,
  type UnmountResolver,
  clearRuntime,
  currentEffectPath,
  currentViewIdentity,
  requireBoundaryMappers,
  requireDispatch,
  requireMountDispatchResolver,
  requireRuntimeContext,
  requireUnmountResolver,
  setRuntime,
} from './runtimeSingleton.js'

export { createKeyedLazy, createLazy } from './lazy.js'
export {
  beginRender as __beginRender,
  createBoundaryRegistry as __createBoundaryRegistry,
} from './boundary.js'
export type { BoundaryRegistry } from './boundary.js'
export { childAttributes } from './childAttribute.js'
export type { ChildAttribute } from './childAttribute.js'
export { defineView } from './block.js'
export type {
  AnyAuthoredView,
  AnyDocumentView,
  AnyBlockView,
  DocumentView,
  BlockConfig,
  BoundBlockConfig,
  BlockView,
} from './block.js'

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
 * Defined here (not in `devTools/`) because the `OnBlur` handler below uses it
 * to suppress blur Messages whose `relatedTarget` is this host (i.e. when
 * focus crosses into the DevTools UI). Surfaced publicly through
 * `foldkit/devtools-host` (not `foldkit/html`); the DevTools overlay imports it
 * from there when creating the host element, so the two stay in sync.
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

const skipImeCompositionKeydown =
  (handle: (event: KeyboardEvent) => void) =>
  (event: KeyboardEvent): void => {
    if (isImeCompositionKeydown(event)) {
      return
    }

    handle(event)
  }

const inputEventValue = (target: EventTarget | null): string => {
  if (
    Predicate.hasProperty(target, 'value') &&
    Predicate.isString(target.value)
  ) {
    return target.value
  }

  if (
    Predicate.hasProperty(target, 'innerText') &&
    Predicate.isString(target.innerText)
  ) {
    return target.innerText
  }

  if (
    Predicate.hasProperty(target, 'textContent') &&
    Predicate.isString(target.textContent)
  ) {
    return target.textContent
  }

  return ''
}

const isEventTargetCurrentTarget = (event: Event): boolean =>
  event.target === event.currentTarget

const isDevToolsFocusTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.id === DEVTOOLS_HOST_ID

const isFocusInsideCurrentTarget = (event: FocusEvent): boolean =>
  event.currentTarget instanceof Element &&
  event.relatedTarget instanceof Node &&
  event.currentTarget.contains(event.relatedTarget)

/** A virtual DOM element. Constructed synchronously by the element factories
 *  on {@link HtmlBuilder}. The runtime patches a `VNode` (or `null` to
 *  render nothing) into the application container. */
export type Html = VNode | null
export type Child = Html | string

/** Whether an event handler leaves the browser's default action in place or
 *  prevents it synchronously. */
export const DefaultAction = Schema.Literals(['Allow', 'Prevent'])
/** Whether an event handler leaves the browser's default action in place or
 *  prevents it synchronously. */
export type DefaultAction = typeof DefaultAction.Type

/** Whether an event continues through its DOM propagation path or stops after
 *  the handlers on its current element have run. */
export const EventPropagation = Schema.Literals(['Bubble', 'Stop'])
/** Whether an event continues through its DOM propagation path or stops after
 *  the handlers on its current element have run. */
export type EventPropagation = typeof EventPropagation.Type

/** Declarative controls for an `OnClick` handler. Omitted
 *  fields keep the browser default, allow the click to bubble, and leave focus
 *  unchanged. */
export const ClickOptions = Schema.Struct({
  defaultAction: Schema.optional(DefaultAction),
  propagation: Schema.optional(EventPropagation),
  focusSelector: Schema.optional(Schema.String),
})
/** Declarative controls for an `OnClick` handler. Omitted
 *  fields keep the browser default, allow the click to bubble, and leave focus
 *  unchanged. */
export type ClickOptions = typeof ClickOptions.Type

/** Text direction for the document root, applied to `dir` on the `<html>`
 *  element. `Auto` defers to the browser's first-strong-character heuristic. */
export const TextDirection = Schema.Literals(['Ltr', 'Rtl', 'Auto'])
/** Text direction for the document root, applied to `dir` on the `<html>`
 *  element. `Auto` defers to the browser's first-strong-character heuristic. */
export type TextDirection = typeof TextDirection.Type

const textDirectionAttributes: Readonly<
  Record<TextDirection, 'ltr' | 'rtl' | 'auto'>
> = {
  Ltr: 'ltr',
  Rtl: 'rtl',
  Auto: 'auto',
}

/** Maps a {@link TextDirection} to the lowercase value written to the `dir`
 *  attribute on the `<html>` element. Shared by the client runtime, which sets
 *  it after each render, and server rendering, which stamps it into the served
 *  shell so the direction is correct on first paint. */
export const textDirectionToAttribute = (
  direction: TextDirection,
): 'ltr' | 'rtl' | 'auto' => textDirectionAttributes[direction]

/** The complete output of a page-owning view. The runtime patches `body` into
 *  the application container, writes `title` to `document.title`, and manages
 *  the optional document metadata.
 *
 *  Supplied `lang` and `dir` values are written to the `<html>` element. An
 *  omitted value leaves the current attribute unchanged, including a value
 *  from the served HTML or an earlier render. Drive both fields from the Model
 *  when the application can switch languages at runtime.
 *
 *  `canonical` has no address-bar default. Derive it from the typed route in
 *  the Model, where the application can decide which route and query values
 *  identify the page. If the view never supplies it, the runtime leaves a
 *  served `<link rel="canonical">` unchanged or keeps the document without one.
 *
 *  Before the client first writes `canonical` or `ogUrl`, it records the value
 *  already present on the corresponding element. A later omission restores
 *  that value, or removes the element if the runtime created it. During
 *  hydration, the recorded value may be metadata rendered for the initial
 *  route. `ogUrl` can be supplied independently; when omitted alongside an
 *  explicit `canonical`, it uses that canonical.
 *
 *  Server rendering returns only the canonical supplied by the view. It
 *  returns `ogUrl` when supplied or falls back to an explicit canonical.
 *
 *  This is the return type of a `makeApplication` view. An application embedded
 *  at a node should use `makeElement`; its view returns `Html` and never changes
 *  the `<head>` or `<html>` element. */
export type Document = Readonly<{
  title: string
  lang?: string
  dir?: TextDirection
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

type OnMountLifecycle = {
  isActive: boolean
  isStarted: boolean
}

type OnMountState = {
  fiber: Fiber.Fiber<unknown, unknown>
  lifecycle: OnMountLifecycle
  notifyEnded: () => void
  owner: MountRenderOwner
  instance?: ActiveInstance
}

const onMountStates = new WeakMap<Element, OnMountState>()

// NOTE: snabbdom `destroy` hooks fire during the patch that removes an element,
// and the hook on the OLD (being-removed) VNode was built in a prior live
// render, so it cannot tell a live patch from a DevTools time-travel replay on
// its own. Mount Effects get this for free because the replayed tree is built
// with `noOpDispatch`, but the `OnUnmount` destroy hook fires against the prior
// live tree, so the runtime opens this window during a replay render and
// the OnUnmount VDOM module defers dispatching a hygiene Message into live
// history. A successful replay discards those callbacks. Patch-failure recovery
// flushes them because it destroys and later rebuilds the imperative live tree.

/** Opens a replay-render window. The runtime calls this immediately before a
 *  DevTools time-travel render and closes it with {@link __endReplayRender}
 *  afterward, so the `OnUnmount` module can defer live callbacks while the
 *  replayed tree is patched in. Without the gate the callback would
 *  enqueue a hygiene Message into live history during mere inspection of past
 *  state. */
export const __beginReplayRender = beginReplayUnmountRender

/** Closes the replay-render window opened by {@link __beginReplayRender}. */
export const __endReplayRender = endReplayUnmountRender

/** Dispatches the live `OnUnmount` callbacks deferred by a replay patch that
 *  failed and forced the runtime to discard the damaged DOM. */
export const __flushReplayUnmountsAfterPatchFailure =
  flushReplayUnmountsAfterPatchFailure

/** Key under which the OnMount attribute stamps a `{ name }` marker on the
 *  snabbdom `VNodeData`. Snabbdom passes unknown data fields through without
 *  rendering them to the DOM, so the marker is invisible at runtime but
 *  observable by VNode walkers (Scene tests). */
export const FOLDKIT_MOUNT_KEY = 'foldkitMount' as const

const MountOccurrencePathTypeId = Symbol('MountOccurrencePath')

type MountOccurrence = Readonly<{
  [MountOccurrencePathTypeId]: ReadonlyArray<string>
}>

/** @internal */
export const mountOccurrencePath = (
  value: FoldkitMountMarker & Partial<MountOccurrence>,
): ReadonlyArray<string> => value[MountOccurrencePathTypeId] ?? []

/** Marker stamped on `VNodeData[FOLDKIT_MOUNT_KEY]` for any element with an
 *  `OnMount` attribute. Carries the Mount Definition's name (and args) so test
 *  introspection can identify pending mounts. When the mount lives inside a
 *  Block boundary, it also carries that boundary's `toParentMessage` chain
 *  (innermost first), as a fallback for VNodes built without a runtime frame.
 *  Frame-built markers privately retain the acquiring occurrence and resolver.
 *  Scene and Runtime use that resolver's current boundary chain for delivery. */
export type FoldkitMountMarker = Readonly<{
  /** @internal Preserves the originating Mount independently of its path. */
  [InvocationIdentityTypeId]?: DefinitionIdentity | undefined
  /** @internal Preserves the originating Mount's declaration name. */
  [InvocationNameTypeId]?: string | undefined
  name: string
  args?: Record<string, unknown>
  messageMappers?: ReadonlyArray<(message: unknown) => unknown>
  [MountRegistrationTypeId]?: MountRegistration
}>

/** An input accepted by HTML, SVG, and MathML element builders.
 *
 * Local tagged attributes use the current builder's dispatcher. A
 * {@link ChildAttribute} carries the originating Block's dispatcher and Mount
 * requirements, so published groups can share the same attribute array.
 * Narrow with `'_tag' in attribute` before inspecting a local discriminator.
 */
export type Attribute<Message, AllowedMountRequirements = never> =
  | TaggedAttribute<Message, AllowedMountRequirements>
  | ChildAttribute<ChildAttributeRequirements<AllowedMountRequirements>>

/** A local tagged attribute before a Block dispatcher is attached.
 *
 * Use this type for raw producers passed to {@link childAttributes}. General
 * element input collections use {@link Attribute}, which also accepts published
 * ChildAttributes. Every TaggedAttribute has an `_tag` discriminator.
 */
export type TaggedAttribute<Message, AllowedMountRequirements = never> =
  | { readonly _tag: 'Key'; readonly value: string }
  | { readonly _tag: 'Class'; readonly value: string }
  | { readonly _tag: 'Id'; readonly value: string }
  | { readonly _tag: 'Title'; readonly value: string }
  | { readonly _tag: 'Lang'; readonly value: string }
  | { readonly _tag: 'Dir'; readonly value: string }
  | { readonly _tag: 'Tabindex'; readonly value: number }
  | { readonly _tag: 'Hidden'; readonly value: boolean }
  | { readonly _tag: 'Contenteditable'; readonly value: string }
  | { readonly _tag: 'Draggable'; readonly value: boolean }
  | { readonly _tag: 'Accesskey'; readonly value: string }
  | { readonly _tag: 'Translate'; readonly value: string }
  | { readonly _tag: 'Inert'; readonly value: boolean }
  | { readonly _tag: 'Popover'; readonly value: string }
  | { readonly _tag: 'Popovertarget'; readonly value: string }
  | { readonly _tag: 'Popovertargetaction'; readonly value: string }
  | {
      readonly _tag: 'OnClick'
      readonly message: Message
      readonly options?: ClickOptions
    }
  | { readonly _tag: 'OnDoubleClick'; readonly message: Message }
  | { readonly _tag: 'OnMouseDown'; readonly message: Message }
  | { readonly _tag: 'OnMouseUp'; readonly message: Message }
  | { readonly _tag: 'OnMouseEnter'; readonly message: Message }
  | { readonly _tag: 'OnMouseLeave'; readonly message: Message }
  | { readonly _tag: 'OnMouseOver'; readonly message: Message }
  | { readonly _tag: 'OnMouseOut'; readonly message: Message }
  | { readonly _tag: 'OnMouseMove'; readonly message: Message }
  | {
      readonly _tag: 'OnPointerMove'
      readonly f: (
        screenX: number,
        screenY: number,
        pointerType: string,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnPointerLeave'
      readonly f: (pointerType: string) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnPointerDown'
      readonly f: (
        pointerType: string,
        button: number,
        screenX: number,
        screenY: number,
        timeStamp: number,
        clientX: number,
        clientY: number,
        pointerId: number,
        target: EventTarget | null,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnPointerUp'
      readonly f: (
        screenX: number,
        screenY: number,
        pointerType: string,
        timeStamp: number,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnKeyDown'
      readonly f: (key: string, modifiers: KeyboardModifiers) => Message
    }
  | {
      readonly _tag: 'OnKeyDownPreventDefault'
      readonly f: (
        key: string,
        modifiers: KeyboardModifiers,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnKeyDownSelf'
      readonly f: (key: string, modifiers: KeyboardModifiers) => Message
    }
  | {
      readonly _tag: 'OnKeyDownSelfPreventDefault'
      readonly f: (
        key: string,
        modifiers: KeyboardModifiers,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnKeyDownFocus'
      readonly f: (
        key: string,
        modifiers: KeyboardModifiers,
      ) => Option.Option<Readonly<{ focusSelector: string; message: Message }>>
    }
  | {
      readonly _tag: 'OnKeyUp'
      readonly f: (key: string, modifiers: KeyboardModifiers) => Message
    }
  | {
      readonly _tag: 'OnKeyUpPreventDefault'
      readonly f: (
        key: string,
        modifiers: KeyboardModifiers,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnKeyPress'
      readonly f: (key: string, modifiers: KeyboardModifiers) => Message
    }
  | { readonly _tag: 'OnFocus'; readonly message: Message }
  | { readonly _tag: 'OnBlur'; readonly message: Message }
  | { readonly _tag: 'OnFocusEnter'; readonly message: Message }
  | { readonly _tag: 'OnFocusLeave'; readonly message: Message }
  | { readonly _tag: 'OnInput'; readonly f: (value: string) => Message }
  | { readonly _tag: 'OnChange'; readonly f: (value: string) => Message }
  | {
      readonly _tag: 'OnBeforeInput'
      readonly f: (inputType: string, data: Option.Option<string>) => Message
    }
  | {
      readonly _tag: 'OnBeforeInputPreventDefault'
      readonly f: (
        inputType: string,
        data: Option.Option<string>,
      ) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnFileChange'
      readonly f: (files: ReadonlyArray<File>) => Message
    }
  | { readonly _tag: 'OnSubmit'; readonly message: Message }
  | { readonly _tag: 'OnReset'; readonly message: Message }
  | { readonly _tag: 'OnScroll'; readonly f: (scrollTop: number) => Message }
  | { readonly _tag: 'OnWheel'; readonly message: Message }
  | { readonly _tag: 'OnCopy'; readonly message: Message }
  | { readonly _tag: 'OnCut'; readonly message: Message }
  | { readonly _tag: 'OnPaste'; readonly message: Message }
  | {
      readonly _tag: 'OnPastePreventDefault'
      readonly f: (text: string) => Option.Option<Message>
    }
  | { readonly _tag: 'OnCopyText'; readonly text: string }
  | {
      readonly _tag: 'OnCutText'
      readonly text: string
      readonly message: Message
    }
  | { readonly _tag: 'OnCancel'; readonly message: Message }
  | {
      readonly _tag: 'OnCancelPreventDefault'
      readonly maybeCustomEventMessage: Option.Option<Message>
    }
  | { readonly _tag: 'OnToggle'; readonly f: (isOpen: boolean) => Message }
  | { readonly _tag: 'OnContextMenu'; readonly message: Message }
  | { readonly _tag: 'OnDragStart'; readonly message: Message }
  | { readonly _tag: 'OnDrag'; readonly message: Message }
  | { readonly _tag: 'OnDragEnd'; readonly message: Message }
  | { readonly _tag: 'OnDragEnter'; readonly message: Message }
  | { readonly _tag: 'OnDragLeave'; readonly message: Message }
  | { readonly _tag: 'OnDragOver'; readonly message: Message }
  | { readonly _tag: 'AllowDrop' }
  | { readonly _tag: 'OnDrop'; readonly message: Message }
  | {
      readonly _tag: 'OnDropFiles'
      readonly f: (files: ReadonlyArray<File>) => Message
    }
  | { readonly _tag: 'OnTouchStart'; readonly message: Message }
  | { readonly _tag: 'OnTouchEnd'; readonly message: Message }
  | { readonly _tag: 'OnTouchMove'; readonly message: Message }
  | { readonly _tag: 'OnTouchCancel'; readonly message: Message }
  | { readonly _tag: 'OnAnimationStart'; readonly message: Message }
  | { readonly _tag: 'OnAnimationEnd'; readonly message: Message }
  | { readonly _tag: 'OnAnimationIteration'; readonly message: Message }
  | { readonly _tag: 'OnTransitionEnd'; readonly message: Message }
  | { readonly _tag: 'OnLoad'; readonly message: Message }
  | { readonly _tag: 'OnError'; readonly message: Message }
  | { readonly _tag: 'OnPlay'; readonly message: Message }
  | { readonly _tag: 'OnPause'; readonly message: Message }
  | { readonly _tag: 'OnEnded'; readonly message: Message }
  | { readonly _tag: 'OnTimeUpdate'; readonly message: Message }
  | { readonly _tag: 'OnVolumeChange'; readonly message: Message }
  | { readonly _tag: 'OnSelect'; readonly message: Message }
  | { readonly _tag: 'Value'; readonly value: string }
  | { readonly _tag: 'Checked'; readonly value: boolean }
  | { readonly _tag: 'Selected'; readonly value: boolean }
  | { readonly _tag: 'Open'; readonly value: boolean }
  | { readonly _tag: 'Placeholder'; readonly value: string }
  | { readonly _tag: 'Name'; readonly value: string }
  | { readonly _tag: 'Disabled'; readonly value: boolean }
  | { readonly _tag: 'Readonly'; readonly value: boolean }
  | { readonly _tag: 'Required'; readonly value: boolean }
  | { readonly _tag: 'Autofocus'; readonly value: boolean }
  | { readonly _tag: 'Spellcheck'; readonly value: boolean }
  | { readonly _tag: 'Autocorrect'; readonly value: string }
  | { readonly _tag: 'Autocapitalize'; readonly value: string }
  | { readonly _tag: 'InputMode'; readonly value: string }
  | { readonly _tag: 'EnterKeyHint'; readonly value: string }
  | { readonly _tag: 'Multiple'; readonly value: boolean }
  | { readonly _tag: 'Type'; readonly value: string }
  | { readonly _tag: 'Accept'; readonly value: string }
  | { readonly _tag: 'Autocomplete'; readonly value: string }
  | { readonly _tag: 'Pattern'; readonly value: string }
  | { readonly _tag: 'Maxlength'; readonly value: number }
  | { readonly _tag: 'Minlength'; readonly value: number }
  | { readonly _tag: 'Size'; readonly value: number }
  | { readonly _tag: 'Cols'; readonly value: number }
  | { readonly _tag: 'Rows'; readonly value: number }
  | { readonly _tag: 'Max'; readonly value: string }
  | { readonly _tag: 'Min'; readonly value: string }
  | { readonly _tag: 'Step'; readonly value: string }
  | { readonly _tag: 'For'; readonly value: string }
  | { readonly _tag: 'Href'; readonly value: string }
  | { readonly _tag: 'Src'; readonly value: string }
  | { readonly _tag: 'Alt'; readonly value: string }
  | { readonly _tag: 'Target'; readonly value: string }
  | { readonly _tag: 'Rel'; readonly value: string }
  | { readonly _tag: 'Download'; readonly value: string }
  | { readonly _tag: 'Action'; readonly value: string }
  | { readonly _tag: 'Method'; readonly value: string }
  | { readonly _tag: 'Enctype'; readonly value: string }
  | { readonly _tag: 'Novalidate'; readonly value: boolean }
  | { readonly _tag: 'Formaction'; readonly value: string }
  | { readonly _tag: 'Formmethod'; readonly value: string }
  | { readonly _tag: 'Formnovalidate'; readonly value: boolean }
  | { readonly _tag: 'Formtarget'; readonly value: string }
  | { readonly _tag: 'Formenctype'; readonly value: string }
  | { readonly _tag: 'Colspan'; readonly value: number }
  | { readonly _tag: 'Rowspan'; readonly value: number }
  | { readonly _tag: 'Scope'; readonly value: string }
  | { readonly _tag: 'Headers'; readonly value: string }
  | { readonly _tag: 'Span'; readonly value: number }
  | { readonly _tag: 'Start'; readonly value: number }
  | { readonly _tag: 'Reversed'; readonly value: boolean }
  | { readonly _tag: 'CiteAttr'; readonly value: string }
  | { readonly _tag: 'Datetime'; readonly value: string }
  | { readonly _tag: 'Wrap'; readonly value: string }
  | { readonly _tag: 'List'; readonly value: string }
  | { readonly _tag: 'FormAttr'; readonly value: string }
  | { readonly _tag: 'LabelAttr'; readonly value: string }
  | { readonly _tag: 'ContentAttr'; readonly value: string }
  | { readonly _tag: 'Charset'; readonly value: string }
  | { readonly _tag: 'HttpEquiv'; readonly value: string }
  | { readonly _tag: 'Srcset'; readonly value: string }
  | { readonly _tag: 'Sizes'; readonly value: string }
  | { readonly _tag: 'Loading'; readonly value: string }
  | { readonly _tag: 'Decoding'; readonly value: string }
  | { readonly _tag: 'Fetchpriority'; readonly value: string }
  | { readonly _tag: 'Crossorigin'; readonly value: string }
  | { readonly _tag: 'Referrerpolicy'; readonly value: string }
  | { readonly _tag: 'Integrity'; readonly value: string }
  | { readonly _tag: 'Hreflang'; readonly value: string }
  | { readonly _tag: 'Ping'; readonly value: string }
  | { readonly _tag: 'Sandbox'; readonly value: string }
  | { readonly _tag: 'Allow'; readonly value: string }
  | { readonly _tag: 'Srcdoc'; readonly value: string }
  | { readonly _tag: 'Autoplay'; readonly value: boolean }
  | { readonly _tag: 'Controls'; readonly value: boolean }
  | { readonly _tag: 'Loop'; readonly value: boolean }
  | { readonly _tag: 'Muted'; readonly value: boolean }
  | { readonly _tag: 'Poster'; readonly value: string }
  | { readonly _tag: 'Preload'; readonly value: string }
  | { readonly _tag: 'Playsinline'; readonly value: boolean }
  | { readonly _tag: 'High'; readonly value: number }
  | { readonly _tag: 'Low'; readonly value: number }
  | { readonly _tag: 'Optimum'; readonly value: number }
  | { readonly _tag: 'Usemap'; readonly value: string }
  | { readonly _tag: 'Ismap'; readonly value: boolean }
  | { readonly _tag: 'Role'; readonly value: string }
  | { readonly _tag: 'AriaLabel'; readonly value: string }
  | { readonly _tag: 'AriaLabelledBy'; readonly value: string }
  | { readonly _tag: 'AriaDescribedBy'; readonly value: string }
  | { readonly _tag: 'AriaHidden'; readonly value: boolean }
  | { readonly _tag: 'AriaExpanded'; readonly value: boolean }
  | { readonly _tag: 'AriaSelected'; readonly value: boolean }
  | { readonly _tag: 'AriaChecked'; readonly value: boolean | 'mixed' }
  | { readonly _tag: 'AriaDisabled'; readonly value: boolean }
  | { readonly _tag: 'AriaRequired'; readonly value: boolean }
  | { readonly _tag: 'AriaInvalid'; readonly value: boolean }
  | { readonly _tag: 'AriaLive'; readonly value: string }
  | { readonly _tag: 'AriaControls'; readonly value: string }
  | { readonly _tag: 'AriaCurrent'; readonly value: string }
  | { readonly _tag: 'AriaOrientation'; readonly value: string }
  | { readonly _tag: 'AriaPressed'; readonly value: string }
  | { readonly _tag: 'AriaHasPopup'; readonly value: string }
  | { readonly _tag: 'AriaActiveDescendant'; readonly value: string }
  | { readonly _tag: 'AriaSort'; readonly value: string }
  | { readonly _tag: 'AriaMultiSelectable'; readonly value: boolean }
  | { readonly _tag: 'AriaModal'; readonly value: boolean }
  | { readonly _tag: 'AriaBusy'; readonly value: boolean }
  | { readonly _tag: 'AriaErrorMessage'; readonly value: string }
  | { readonly _tag: 'AriaRoleDescription'; readonly value: string }
  | { readonly _tag: 'AriaAtomic'; readonly value: boolean }
  | { readonly _tag: 'AriaAutocomplete'; readonly value: string }
  | { readonly _tag: 'AriaColcount'; readonly value: number }
  | { readonly _tag: 'AriaColindex'; readonly value: number }
  | { readonly _tag: 'AriaColspan'; readonly value: number }
  | { readonly _tag: 'AriaDescription'; readonly value: string }
  | { readonly _tag: 'AriaDetails'; readonly value: string }
  | { readonly _tag: 'AriaFlowto'; readonly value: string }
  | { readonly _tag: 'AriaKeyshortcuts'; readonly value: string }
  | { readonly _tag: 'AriaLevel'; readonly value: number }
  | { readonly _tag: 'AriaOwns'; readonly value: string }
  | { readonly _tag: 'AriaPlaceholder'; readonly value: string }
  | { readonly _tag: 'AriaPosinset'; readonly value: number }
  | { readonly _tag: 'AriaReadonly'; readonly value: boolean }
  | { readonly _tag: 'AriaRelevant'; readonly value: string }
  | { readonly _tag: 'AriaRowcount'; readonly value: number }
  | { readonly _tag: 'AriaRowindex'; readonly value: number }
  | { readonly _tag: 'AriaRowspan'; readonly value: number }
  | { readonly _tag: 'AriaSetsize'; readonly value: number }
  | { readonly _tag: 'AriaValuemax'; readonly value: number }
  | { readonly _tag: 'AriaValuemin'; readonly value: number }
  | { readonly _tag: 'AriaValuenow'; readonly value: number }
  | { readonly _tag: 'AriaValuetext'; readonly value: string }
  | { readonly _tag: 'Attribute'; readonly key: string; readonly value: string }
  | {
      readonly _tag: 'DataAttribute'
      readonly key: string
      readonly value: string
    }
  | { readonly _tag: 'Style'; readonly value: Record<string, string> }
  | { readonly _tag: 'InnerHTML'; readonly value: string }
  | { readonly _tag: 'ViewBox'; readonly value: string }
  | { readonly _tag: 'Xmlns'; readonly value: string }
  | { readonly _tag: 'Fill'; readonly value: string }
  | { readonly _tag: 'FillRule'; readonly value: string }
  | { readonly _tag: 'ClipRule'; readonly value: string }
  | { readonly _tag: 'Stroke'; readonly value: string }
  | { readonly _tag: 'StrokeWidth'; readonly value: string }
  | { readonly _tag: 'StrokeLinecap'; readonly value: string }
  | { readonly _tag: 'StrokeLinejoin'; readonly value: string }
  | { readonly _tag: 'D'; readonly value: string }
  | { readonly _tag: 'Cx'; readonly value: string }
  | { readonly _tag: 'Cy'; readonly value: string }
  | { readonly _tag: 'R'; readonly value: string }
  | { readonly _tag: 'X'; readonly value: string }
  | { readonly _tag: 'Y'; readonly value: string }
  | { readonly _tag: 'Width'; readonly value: string }
  | { readonly _tag: 'Height'; readonly value: string }
  | { readonly _tag: 'X1'; readonly value: string }
  | { readonly _tag: 'Y1'; readonly value: string }
  | { readonly _tag: 'X2'; readonly value: string }
  | { readonly _tag: 'Y2'; readonly value: string }
  | { readonly _tag: 'Points'; readonly value: string }
  | { readonly _tag: 'Transform'; readonly value: string }
  | { readonly _tag: 'Opacity'; readonly value: string }
  | { readonly _tag: 'StrokeDasharray'; readonly value: string }
  | { readonly _tag: 'StrokeDashoffset'; readonly value: string }
  | { readonly _tag: 'Dx'; readonly value: string }
  | { readonly _tag: 'Dy'; readonly value: string }
  | { readonly _tag: 'Rotate'; readonly value: string }
  | { readonly _tag: 'TextAnchor'; readonly value: string }
  | { readonly _tag: 'DominantBaseline'; readonly value: string }
  | { readonly _tag: 'AlignmentBaseline'; readonly value: string }
  | { readonly _tag: 'BaselineShift'; readonly value: string }
  | { readonly _tag: 'TextLength'; readonly value: string }
  | { readonly _tag: 'LengthAdjust'; readonly value: string }
  | { readonly _tag: 'FontFamily'; readonly value: string }
  | { readonly _tag: 'FontSize'; readonly value: string }
  | { readonly _tag: 'FontWeight'; readonly value: string }
  | { readonly _tag: 'FontStyle'; readonly value: string }
  | { readonly _tag: 'LetterSpacing'; readonly value: string }
  | { readonly _tag: 'WordSpacing'; readonly value: string }
  | { readonly _tag: 'TextDecoration'; readonly value: string }
  | { readonly _tag: 'WritingMode'; readonly value: string }
  | { readonly _tag: 'Rx'; readonly value: string }
  | { readonly _tag: 'Ry'; readonly value: string }
  | { readonly _tag: 'PathLength'; readonly value: string }
  | { readonly _tag: 'FillOpacity'; readonly value: string }
  | { readonly _tag: 'StrokeOpacity'; readonly value: string }
  | { readonly _tag: 'StrokeMiterlimit'; readonly value: string }
  | { readonly _tag: 'PaintOrder'; readonly value: string }
  | { readonly _tag: 'VectorEffect'; readonly value: string }
  | { readonly _tag: 'Color'; readonly value: string }
  | { readonly _tag: 'Visibility'; readonly value: string }
  | { readonly _tag: 'Display'; readonly value: string }
  | { readonly _tag: 'Overflow'; readonly value: string }
  | { readonly _tag: 'PointerEvents'; readonly value: string }
  | { readonly _tag: 'Cursor'; readonly value: string }
  | { readonly _tag: 'ShapeRendering'; readonly value: string }
  | { readonly _tag: 'TextRendering'; readonly value: string }
  | { readonly _tag: 'ImageRendering'; readonly value: string }
  | { readonly _tag: 'ClipPath'; readonly value: string }
  | { readonly _tag: 'Mask'; readonly value: string }
  | { readonly _tag: 'Filter'; readonly value: string }
  | { readonly _tag: 'ClipPathUnits'; readonly value: string }
  | { readonly _tag: 'MaskUnits'; readonly value: string }
  | { readonly _tag: 'MaskContentUnits'; readonly value: string }
  | { readonly _tag: 'FilterUnits'; readonly value: string }
  | { readonly _tag: 'PrimitiveUnits'; readonly value: string }
  | { readonly _tag: 'Offset'; readonly value: string }
  | { readonly _tag: 'StopColor'; readonly value: string }
  | { readonly _tag: 'StopOpacity'; readonly value: string }
  | { readonly _tag: 'GradientUnits'; readonly value: string }
  | { readonly _tag: 'GradientTransform'; readonly value: string }
  | { readonly _tag: 'SpreadMethod'; readonly value: string }
  | { readonly _tag: 'Fx'; readonly value: string }
  | { readonly _tag: 'Fy'; readonly value: string }
  | { readonly _tag: 'Fr'; readonly value: string }
  | { readonly _tag: 'PatternUnits'; readonly value: string }
  | { readonly _tag: 'PatternContentUnits'; readonly value: string }
  | { readonly _tag: 'PatternTransform'; readonly value: string }
  | { readonly _tag: 'MarkerStart'; readonly value: string }
  | { readonly _tag: 'MarkerMid'; readonly value: string }
  | { readonly _tag: 'MarkerEnd'; readonly value: string }
  | { readonly _tag: 'MarkerWidth'; readonly value: string }
  | { readonly _tag: 'MarkerHeight'; readonly value: string }
  | { readonly _tag: 'MarkerUnits'; readonly value: string }
  | { readonly _tag: 'RefX'; readonly value: string }
  | { readonly _tag: 'RefY'; readonly value: string }
  | { readonly _tag: 'Orient'; readonly value: string }
  | { readonly _tag: 'PreserveAspectRatio'; readonly value: string }
  | { readonly _tag: 'Prop'; readonly key: string; readonly value: unknown }
  | {
      readonly _tag: 'OnCustomEvent'
      readonly name: string
      readonly f: (event: CustomEvent<unknown>) => Option.Option<Message>
    }
  | {
      readonly _tag: 'OnMount'
      readonly action: MountAction<
        Message,
        unknown,
        never | AllowedMountRequirements
      >
    }
  | {
      readonly _tag: 'OnUnmount'
      readonly message: Message
    }

interface AttributeDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: TaggedAttribute<this['A'], any>
}

const { Prop, OnCustomEvent } = Data.taggedEnum<AttributeDefinition>()

export { Prop, OnCustomEvent }

// BUILD CONTEXT: per-VNode bag of mutable VNode data plus the dispatchers this
// VNode's events and Mount results route through. Allocated once per unique
// dispatcher in `buildVNodeData`, typically once total (a second time when
// ChildAttribute items route through a child Block's own dispatch).
/** @internal Mount capabilities supplied by registered child bindings. */
export type ChildAttributeRequirements<Requirements> =
  Requirements extends Readonly<{
    __blockBindingRequirement: Readonly<{
      block: Readonly<{
        mountRequirements: () => infer MountRequirements
      }>
    }>
  }>
    ? MountRequirements
    : Requirements

type BuildContext = Readonly<{
  data: VNodeData
  getPostpatchProps: () => Array<Readonly<{ propName: string; value: unknown }>>
  dispatch: DispatchSync
  resolveUnmount: UnmountResolver
  boundaryMappers: ReadonlyArray<(message: unknown) => unknown>
  resolveMountDispatch?: MountDispatchResolver
  getCapturedContext: () => Context.Context<never>
}>

const setData = <K extends keyof VNodeData>(
  ctx: BuildContext,
  key: K,
  value: VNodeData[K],
): void => {
  ctx.data[key] = value
}

const addVNodeDataMask = (ctx: BuildContext, dataMask: number): void => {
  ctx.data[vnodeDataMaskKey] = (ctx.data[vnodeDataMaskKey] ?? 0) | dataMask
}

const setModuleData = <K extends keyof VNodeData>(
  ctx: BuildContext,
  key: K,
  value: VNodeData[K],
  dataMask: number,
): void => {
  ctx.data[key] = value
  addVNodeDataMask(ctx, dataMask)
}

// NOTE: single-key fast paths. The bulk of attribute handlers set exactly
// one prop, attr, or event handler; writing it directly into the vnode data
// avoids allocating a `{ key: value }` literal and merging it per attribute.
const writeDataProp = (
  ctx: BuildContext,
  key: string,
  value: unknown,
): Record<string, unknown> => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const props = (ctx.data.props ??= {}) as Record<string, unknown>
  if (key === '__proto__') {
    Object.defineProperty(props, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    })
  } else {
    props[key] = value
  }
  addVNodeDataMask(ctx, VNodeDataMask.Props)
  return props
}

// A typed attribute builder writes the DOM property that reflects the HTML
// attribute it is named after, so the server serializer can emit it as that
// attribute even on a custom element, where a same-named component property
// would mean something else entirely. Overwriting a property a generic write
// left behind takes the name back, so the mark always describes the value that
// is actually in the bag. The unmark is a no-op unless a generic write happened
// on this element, which keeps the common path free of any bookkeeping.
const setDataProp = (ctx: BuildContext, key: string, value: unknown): void => {
  const props = writeDataProp(ctx, key, value)
  unmarkClientOnlyProperty(props, key)
}

// `Prop` writes a DOM property and claims nothing about what it means: the
// value may be a client-only component property, and the name may collide with
// one an attribute builder owns. `CustomElement.define` property factories
// produce `Prop`, so a declared component property lands here too.
const setClientOnlyDataProp = (
  ctx: BuildContext,
  key: string,
  value: unknown,
): void => {
  const props = writeDataProp(ctx, key, value)
  markClientOnlyProperty(props, key)
}

// NOTE: `h.InnerHTML` marks the value it wrote as markup the view author intends
// to be parsed as HTML, which is what lets the server serializer write it to the
// raw sink. A custom-element property or raw `Prop` named `innerHTML` marks the
// same key client-only instead. The marks are mutually exclusive, so the last
// builder owns the key even when both builders wrote exactly the same string.
const setTrustedInnerHtml = (ctx: BuildContext, value: string): void => {
  const props = writeDataProp(ctx, 'innerHTML', value)
  markTrustedInnerHtml(props, value)
}

const setDataAttr = (
  ctx: BuildContext,
  key: string,
  value: string | number | boolean,
): void => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const attrs = (ctx.data.attrs ??= {}) as Record<
    string,
    string | number | boolean
  >
  attrs[key] = value
  addVNodeDataMask(ctx, VNodeDataMask.Attrs)
}

const addDataOn = (
  ctx: BuildContext,
  eventName: string,
  handler: (...args: ReadonlyArray<never>) => void,
): void => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const on = (ctx.data.on ??= {}) as Record<string, unknown>
  addVNodeDataMask(ctx, VNodeDataMask.On)
  const existingHandler = on[eventName]
  if (existingHandler === undefined) {
    on[eventName] = handler
  } else {
    // NOTE: chain in registration order, mirroring updateDataOn.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const previous = existingHandler as (...args: ReadonlyArray<never>) => void
    on[eventName] = (...args: ReadonlyArray<never>) => {
      previous(...args)
      handler(...args)
    }
  }
}

// Event handlers chain per DOM event in spread order. Without this,
// `Object.assign` would silently drop earlier handlers for the same
// event when a consumer spreads published ChildAttributes alongside
// their own (e.g. `[...attributes.checkbox, h.OnClick(MyMsg())]` would
// drop one of the two click handlers depending on order). Each chained
// handler is invoked synchronously in registration order; if an
// earlier handler throws, later handlers do not run (mirroring native
// exception propagation, not silently swallowing bugs).
const updateDataOn = (ctx: BuildContext, on: On): void => {
  addVNodeDataMask(ctx, VNodeDataMask.On)
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

// The values a numeric builder accepts, per property.
//
// The server writes these as attribute text and a browser parses them; the
// client assigns them through the DOM property. The two do not agree
// everywhere. Assigning a negative `maxLength` throws IndexSizeError while the
// attribute parses to -1; `size = 0` throws while the attribute falls back to
// 20; `Infinity` and `NaN` become 0 through the property and the attribute's own
// default through the parser; and past 2^31 the property conversions wrap while
// the attribute clamps.
//
// The bounds below were measured in Chromium: within them, a parsed attribute
// and a direct assignment produce the same property for every builder here.
// Outside them the two disagree or the assignment throws, so the value is
// refused where it is written rather than diverging once served.
const SIGNED_LONG_MAXIMUM = 2147483647
const SIGNED_LONG_MINIMUM = -SIGNED_LONG_MAXIMUM - 1

const NUMERIC_PROPERTY_RANGES: Readonly<
  Record<string, Readonly<{ minimum: number; maximum: number }>>
> = {
  cols: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  colSpan: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  maxLength: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  minLength: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  rows: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  rowSpan: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  size: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  span: { minimum: 0, maximum: SIGNED_LONG_MAXIMUM },
  // An ordered list may start anywhere, and negatives agree on both sides.
  start: { minimum: SIGNED_LONG_MINIMUM, maximum: SIGNED_LONG_MAXIMUM },
  // Any element can carry one, and the two sides agree across the whole signed
  // long range. Outside it they part company in a way no value hints at: an
  // out-of-range assignment wraps (2147483648 becomes -2147483648) while the
  // attribute falls back to the element's default, which is 0 on a focusable
  // element and -1 on any other, so the same view yields a focusable served
  // element and an unreachable fresh one.
  tabIndex: { minimum: SIGNED_LONG_MINIMUM, maximum: SIGNED_LONG_MAXIMUM },
}

const numericPropertyRefusal = (propName: string, value: number): string =>
  `[foldkit] ${propName} was given ${String(value)}, which a browser reads ` +
  'differently depending on whether it arrives as parsed markup or as a ' +
  'property assignment, and which can throw outright when assigned. '

const setNumericDataProp = (
  ctx: BuildContext,
  propName: string,
  value: number,
): void => {
  const range = NUMERIC_PROPERTY_RANGES[propName]
  if (
    range !== undefined &&
    !(
      Number.isInteger(value) &&
      value >= range.minimum &&
      value <= range.maximum
    )
  ) {
    throw new Error(
      numericPropertyRefusal(propName, value) +
        `Use an integer from ${String(range.minimum)} to ` +
        `${String(range.maximum)}.`,
    )
  }
  setDataProp(ctx, propName, value)
}

const setFiniteNumericDataProp = (
  ctx: BuildContext,
  propName: string,
  value: number,
): void => {
  if (!Number.isFinite(value)) {
    throw new Error(
      numericPropertyRefusal(propName, value) + 'Use a finite number.',
    )
  }
  setDataProp(ctx, propName, value)
}

const updatePropsWithPostpatch = (
  ctx: BuildContext,
  propName: string,
  value: unknown,
): void => {
  setDataProp(ctx, propName, value)
  ctx.getPostpatchProps().push({ propName, value })
}

// NOTE: class strings repeat heavily across elements and renders, so the
// parsed class object is cached per distinct string. Cached objects are
// shared across vnodes; snabbdom's classModule only reads them, and the
// Class handler installs them via `setData` (never merged into), so sharing
// is safe. Class strings interpolated from model data can take unboundedly
// many values, so the cache clears at a size cap instead of retaining every
// string for the page lifetime; the render after a clear re-parses and
// re-caches what it actually uses.
const CLASS_OBJECT_CACHE_LIMIT = 10_000
const classObjectCache = new Map<string, Readonly<Record<string, true>>>()

const classObjectFor = (value: string): Readonly<Record<string, true>> => {
  const cached = classObjectCache.get(value)
  if (cached !== undefined) {
    return cached
  }
  const classObject: Record<string, true> = {}
  for (const className of value.split(/\s+/)) {
    if (className !== '') {
      classObject[className] = true
    }
  }
  if (classObjectCache.size >= CLASS_OBJECT_CACHE_LIMIT) {
    classObjectCache.clear()
  }
  classObjectCache.set(value, classObject)
  return classObject
}

// NOTE: navigation and resource URL attributes (href, src, action,
// formaction) execute script when their scheme is `javascript:` or
// `vbscript:`, so an untrusted value bound to them is an XSS sink. Browsers
// ignore ASCII control characters embedded in a scheme (`java\tscript:`
// still runs), so those are stripped before the scheme is read. A dangerous
// scheme neutralizes to an empty value; every other URL, including relative
// paths, http(s), mailto, tel, and data URLs, passes through unchanged.
const DANGEROUS_URL_SCHEMES: ReadonlySet<string> = new Set([
  'javascript',
  'vbscript',
])
const URL_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g
const URL_SCHEME_PATTERN = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/

const sanitizeUrl = (value: string): string => {
  const match = URL_SCHEME_PATTERN.exec(
    value.replace(URL_CONTROL_CHARACTERS, ''),
  )
  if (match !== null) {
    const scheme = match[1]
    if (
      scheme !== undefined &&
      DANGEROUS_URL_SCHEMES.has(scheme.toLowerCase())
    ) {
      return ''
    }
  }
  return value
}

type AttributeTag = TaggedAttribute<unknown, any>['_tag']
type AttributeByTag<Tag extends AttributeTag> = Extract<
  TaggedAttribute<unknown, any>,
  Readonly<{ _tag: Tag }>
>
type ValueAttribute = Extract<
  TaggedAttribute<unknown, any>,
  Readonly<{ value: unknown }>
>
type CallbackAttribute = Extract<
  TaggedAttribute<unknown, any>,
  Readonly<{ f: unknown }>
>

type AttributeHandler<Tag extends AttributeTag> = (
  attribute: AttributeByTag<Tag>,
  ctx: BuildContext,
) => void
type AttributeDefinitions = {
  readonly [Tag in AttributeTag]: readonly [
    create: Tag extends keyof HtmlAttributes<unknown, any>
      ? (tag: Tag) => HtmlAttributes<unknown, any>[Tag]
      : undefined,
    apply: AttributeHandler<Tag>,
  ]
}

const makeValueAttribute =
  <Tag extends ValueAttribute['_tag']>(tag: Tag) =>
  (value: Extract<ValueAttribute, { _tag: Tag }>['value']) => ({
    value,
    _tag: tag,
  })
const makeMessageAttribute =
  <Tag extends AttributeTag>(tag: Tag) =>
  (message: unknown) => ({ message, _tag: tag })
const makeCallbackAttribute =
  <Tag extends CallbackAttribute['_tag']>(tag: Tag) =>
  (f: Extract<CallbackAttribute, { _tag: Tag }>['f']) => ({ f, _tag: tag })
const makeTextAttribute = (tag: 'OnCopyText') => (text: string) => ({
  text,
  _tag: tag,
})
const makeMountAttribute =
  (tag: 'OnMount') =>
  <Action extends MountAction<unknown, unknown, any>>(action: Action) => {
    const path = currentEffectPath()
    const owned = ownerOfInvocation(action)
    const viewIdentity = currentViewIdentity()
    if (
      owned !== undefined &&
      viewIdentity !== undefined &&
      owned.owner !== viewIdentity.owner
    ) {
      throw new Error(
        `[foldkit] Mount "${action.name}" belongs to a different Block. Render it through that Block's binding.`,
      )
    }
    if (
      owned !== undefined &&
      viewIdentity !== undefined &&
      !viewIdentity.mounts.some(mount => identityOf(mount) === owned.identity)
    ) {
      throw new Error(
        `[foldkit] Mount "${action.name}" is not registered in this view's Mounts.`,
      )
    }
    const name =
      owned === undefined || Array.isReadonlyArrayEmpty(path)
        ? action.name
        : `${path.join('/')}/${action.name.slice(owned.owner.id.length + 1)}`
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const capturedAction = {
      ...action,
      name,
      [MountOccurrencePathTypeId]: [...path],
    } as typeof action
    return { _tag: tag, action: capturedAction }
  }
const makeKeyValueAttribute =
  <Tag extends 'Attribute' | 'DataAttribute'>(tag: Tag) =>
  (key: string, value: string) => ({ key, value, _tag: tag })

const attributeDefinitions: AttributeDefinitions = {
  Key: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setData(ctx, 'key', value),
  ],
  Class: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setModuleData(ctx, 'class', classObjectFor(value), VNodeDataMask.Class),
  ],
  Id: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'id', value),
  ],
  Title: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'title', value),
  ],
  Lang: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'lang', value),
  ],
  Dir: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'dir', value),
  ],
  Tabindex: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setNumericDataProp(ctx, 'tabIndex', value),
  ],
  Hidden: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'hidden', value),
  ],
  Contenteditable: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'contenteditable', value),
  ],
  Draggable: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'draggable', value),
  ],
  Accesskey: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'accesskey', value),
  ],
  Translate: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'translate', value),
  ],
  Inert: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'inert', value),
  ],
  Popover: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'popover', value),
  ],
  Popovertarget: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'popovertarget', value),
  ],
  Popovertargetaction: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'popovertargetaction', value),
  ],
  OnClick: [
    tag => (message, options) =>
      options === undefined
        ? { message, _tag: tag }
        : { message, options, _tag: tag },
    ({ message, options }, ctx: BuildContext) =>
      addDataOn(ctx, 'click', (event: MouseEvent) => {
        if (options?.defaultAction === 'Prevent') {
          event.preventDefault()
        }
        if (options?.propagation === 'Stop') {
          event.stopPropagation()
        }
        const focusSelector = options?.focusSelector
        if (focusSelector !== undefined) {
          const focusTarget = document.querySelector(focusSelector)
          if (focusTarget instanceof HTMLElement) {
            focusTarget.focus()
          }
        }
        ctx.dispatch(message)
      }),
  ],
  OnDoubleClick: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'dblclick', () => ctx.dispatch(message)),
  ],
  OnMouseDown: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mousedown', () => ctx.dispatch(message)),
  ],
  OnMouseUp: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mouseup', () => ctx.dispatch(message)),
  ],
  OnMouseEnter: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mouseenter', () => ctx.dispatch(message)),
  ],
  OnMouseLeave: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mouseleave', () => ctx.dispatch(message)),
  ],
  OnMouseOver: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mouseover', () => ctx.dispatch(message)),
  ],
  OnMouseOut: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mouseout', () => ctx.dispatch(message)),
  ],
  OnMouseMove: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'mousemove', () => ctx.dispatch(message)),
  ],
  OnPointerMove: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        pointermove: (event: PointerEvent) => {
          const maybeMessage = toMaybeMessage(
            event.screenX,
            event.screenY,
            event.pointerType,
          )
          if (Option.isSome(maybeMessage)) {
            ctx.dispatch(maybeMessage.value)
          }
        },
      }),
  ],
  OnPointerLeave: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        pointerleave: (event: PointerEvent) => {
          const maybeMessage = toMaybeMessage(event.pointerType)
          if (Option.isSome(maybeMessage)) {
            ctx.dispatch(maybeMessage.value)
          }
        },
      }),
  ],
  OnPointerDown: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        pointerdown: (event: PointerEvent) => {
          const maybeMessage = toMaybeMessage(
            event.pointerType,
            event.button,
            event.screenX,
            event.screenY,
            event.timeStamp,
            event.clientX,
            event.clientY,
            event.pointerId,
            event.target,
          )
          if (Option.isSome(maybeMessage)) {
            ctx.dispatch(maybeMessage.value)
          }
        },
      }),
  ],
  OnPointerUp: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        pointerup: (event: PointerEvent) => {
          const maybeMessage = toMaybeMessage(
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
  ],
  OnKeyDown: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keydown: skipImeCompositionKeydown(event => {
          ctx.dispatch(toMessage(event.key, keyboardModifiers(event)))
        }),
      }),
  ],
  OnKeyDownPreventDefault: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keydown: skipImeCompositionKeydown(event => {
          const maybeMessage = toMaybeMessage(
            event.key,
            keyboardModifiers(event),
          )
          if (Option.isSome(maybeMessage)) {
            event.preventDefault()
            ctx.dispatch(maybeMessage.value)
          }
        }),
      }),
  ],
  OnKeyDownSelf: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keydown: skipImeCompositionKeydown(event => {
          if (isEventTargetCurrentTarget(event)) {
            ctx.dispatch(toMessage(event.key, keyboardModifiers(event)))
          }
        }),
      }),
  ],
  OnKeyDownSelfPreventDefault: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keydown: skipImeCompositionKeydown(event => {
          if (!isEventTargetCurrentTarget(event)) {
            return
          }

          const maybeMessage = toMaybeMessage(
            event.key,
            keyboardModifiers(event),
          )
          if (Option.isSome(maybeMessage)) {
            event.preventDefault()
            ctx.dispatch(maybeMessage.value)
          }
        }),
      }),
  ],
  OnKeyDownFocus: [
    makeCallbackAttribute,
    ({ f: toMaybeFocusAndMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keydown: skipImeCompositionKeydown(event => {
          const maybeResult = toMaybeFocusAndMessage(
            event.key,
            keyboardModifiers(event),
          )
          if (Option.isSome(maybeResult)) {
            event.preventDefault()
            const { focusSelector, message } = maybeResult.value
            const focusTarget = document.querySelector(focusSelector)
            if (focusTarget instanceof HTMLElement) {
              focusTarget.focus()
            }
            ctx.dispatch(message)
          }
        }),
      }),
  ],
  OnKeyUp: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keyup: (event: KeyboardEvent) =>
          ctx.dispatch(toMessage(event.key, keyboardModifiers(event))),
      }),
  ],
  OnKeyUpPreventDefault: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keyup: (event: KeyboardEvent) => {
          const maybeMessage = toMaybeMessage(
            event.key,
            keyboardModifiers(event),
          )
          if (Option.isSome(maybeMessage)) {
            event.preventDefault()
            ctx.dispatch(maybeMessage.value)
          }
        },
      }),
  ],
  OnKeyPress: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        keypress: (event: KeyboardEvent) =>
          ctx.dispatch(toMessage(event.key, keyboardModifiers(event))),
      }),
  ],
  OnFocus: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'focus', () => ctx.dispatch(message)),
  ],
  OnBlur: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        blur: (event: FocusEvent) => {
          if (isDevToolsFocusTarget(event.relatedTarget)) {
            return
          }
          ctx.dispatch(message)
        },
      }),
  ],
  OnFocusEnter: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        focusin: (event: FocusEvent) => {
          if (!isFocusInsideCurrentTarget(event)) {
            ctx.dispatch(message)
          }
        },
      }),
  ],
  OnFocusLeave: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        focusout: (event: FocusEvent) => {
          if (!isFocusInsideCurrentTarget(event)) {
            ctx.dispatch(message)
          }
        },
      }),
  ],
  OnInput: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        input: (event: Event) =>
          ctx.dispatch(toMessage(inputEventValue(event.target))),
      }),
  ],
  OnChange: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        change: (event: Event) =>
          ctx.dispatch(toMessage(inputEventValue(event.target))),
      }),
  ],
  OnBeforeInput: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        beforeinput: (event: InputEvent) =>
          ctx.dispatch(
            toMessage(event.inputType, Option.fromNullishOr(event.data)),
          ),
      }),
  ],
  OnBeforeInputPreventDefault: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        beforeinput: (event: InputEvent) => {
          if (!event.cancelable) {
            return
          }

          const maybeMessage = toMaybeMessage(
            event.inputType,
            Option.fromNullishOr(event.data),
          )
          if (Option.isSome(maybeMessage)) {
            event.preventDefault()
            ctx.dispatch(maybeMessage.value)
          }
        },
      }),
  ],
  OnFileChange: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        change: tagAsFileHandler((event: Event) => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const target = event.target as HTMLInputElement
          const files: ReadonlyArray<File> = target.files
            ? Array.fromIterable(target.files)
            : Array.empty()
          target.value = ''
          ctx.dispatch(toMessage(files))
        }, 'OnFileChange'),
      }),
  ],
  OnSubmit: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        submit: (event: Event) => {
          event.preventDefault()
          ctx.dispatch(message)
        },
      }),
  ],
  OnReset: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'reset', () => ctx.dispatch(message)),
  ],
  OnScroll: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        scroll: (event: Event) =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          ctx.dispatch(toMessage((event.target as HTMLElement).scrollTop)),
      }),
  ],
  OnWheel: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'wheel', () => ctx.dispatch(message)),
  ],
  OnCopy: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'copy', () => ctx.dispatch(message)),
  ],
  OnCut: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'cut', () => ctx.dispatch(message)),
  ],
  OnPaste: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'paste', () => ctx.dispatch(message)),
  ],
  OnPastePreventDefault: [
    makeCallbackAttribute,
    ({ f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        paste: (event: ClipboardEvent) => {
          const text = event.clipboardData?.getData('text/plain') ?? ''
          const maybeMessage = toMaybeMessage(text)
          if (Option.isSome(maybeMessage)) {
            event.preventDefault()
            ctx.dispatch(maybeMessage.value)
          }
        },
      }),
  ],
  OnCopyText: [
    makeTextAttribute,
    ({ text }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        copy: (event: ClipboardEvent) => {
          if (event.clipboardData) {
            event.clipboardData.setData('text/plain', text)
            event.preventDefault()
          }
        },
      }),
  ],
  OnCutText: [
    tag => (text, message) => ({ text, message, _tag: tag }),
    ({ text, message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        cut: (event: ClipboardEvent) => {
          if (event.clipboardData) {
            event.clipboardData.setData('text/plain', text)
            event.preventDefault()
            ctx.dispatch(message)
          }
        },
      }),
  ],
  OnCancel: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        cancel: (event: Event) => {
          event.preventDefault()
          ctx.dispatch(message)
        },
      }),
  ],
  OnCancelPreventDefault: [
    tag => customEventMessage => ({
      maybeCustomEventMessage: Option.fromNullishOr(customEventMessage),
      _tag: tag,
    }),
    ({ maybeCustomEventMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        cancel: (event: Event) => {
          event.preventDefault()
          if (
            event instanceof CustomEvent &&
            Option.isSome(maybeCustomEventMessage)
          ) {
            ctx.dispatch(maybeCustomEventMessage.value)
          }
        },
      }),
  ],
  OnToggle: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        toggle: event =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          ctx.dispatch(toMessage((event.target as HTMLDetailsElement).open)),
      }),
  ],
  OnContextMenu: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        contextmenu: (event: Event) => {
          event.preventDefault()
          ctx.dispatch(message)
        },
      }),
  ],
  OnDragStart: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'dragstart', () => ctx.dispatch(message)),
  ],
  OnDrag: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'drag', () => ctx.dispatch(message)),
  ],
  OnDragEnd: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'dragend', () => ctx.dispatch(message)),
  ],
  OnDragEnter: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
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
  ],
  OnDragLeave: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
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
  ],
  OnDragOver: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        dragover: (event: Event) => {
          event.preventDefault()
          ctx.dispatch(message)
        },
      }),
  ],
  AllowDrop: [
    tag => () => ({ _tag: tag }),
    (_attribute, ctx: BuildContext) =>
      updateDataOn(ctx, {
        dragover: (event: Event) => {
          event.preventDefault()
        },
      }),
  ],
  OnDrop: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
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
  ],
  OnDropFiles: [
    makeCallbackAttribute,
    ({ f: toMessage }, ctx: BuildContext) =>
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
          ctx.dispatch(toMessage(files))
        }, 'OnDropFiles'),
      }),
  ],
  OnTouchStart: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'touchstart', () => ctx.dispatch(message)),
  ],
  OnTouchEnd: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'touchend', () => ctx.dispatch(message)),
  ],
  OnTouchMove: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'touchmove', () => ctx.dispatch(message)),
  ],
  OnTouchCancel: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'touchcancel', () => ctx.dispatch(message)),
  ],
  OnAnimationStart: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'animationstart', () => ctx.dispatch(message)),
  ],
  OnAnimationEnd: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'animationend', () => ctx.dispatch(message)),
  ],
  OnAnimationIteration: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'animationiteration', () => ctx.dispatch(message)),
  ],
  OnTransitionEnd: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'transitionend', () => ctx.dispatch(message)),
  ],
  OnLoad: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'load', () => ctx.dispatch(message)),
  ],
  OnError: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'error', () => ctx.dispatch(message)),
  ],
  OnPlay: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'play', () => ctx.dispatch(message)),
  ],
  OnPause: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'pause', () => ctx.dispatch(message)),
  ],
  OnEnded: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'ended', () => ctx.dispatch(message)),
  ],
  OnTimeUpdate: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'timeupdate', () => ctx.dispatch(message)),
  ],
  OnVolumeChange: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'volumechange', () => ctx.dispatch(message)),
  ],
  OnSelect: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) =>
      addDataOn(ctx, 'select', () => ctx.dispatch(message)),
  ],
  Value: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      updatePropsWithPostpatch(ctx, 'value', value),
  ],
  Checked: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      updatePropsWithPostpatch(ctx, 'checked', value),
  ],
  Selected: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      updatePropsWithPostpatch(ctx, 'selected', value),
  ],
  Open: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      updatePropsWithPostpatch(ctx, 'open', value),
  ],
  Placeholder: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'placeholder', value),
  ],
  Name: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'name', value),
  ],
  Disabled: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'disabled', value),
  ],
  Readonly: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'readOnly', value),
  ],
  Required: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'required', value),
  ],
  Autofocus: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'autofocus', value),
  ],
  Spellcheck: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'spellcheck', value.toString()),
  ],
  Autocorrect: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'autocorrect', value),
  ],
  Autocapitalize: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'autocapitalize', value),
  ],
  InputMode: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'inputmode', value),
  ],
  EnterKeyHint: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'enterkeyhint', value),
  ],
  Multiple: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'multiple', value),
  ],
  Type: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'type', value),
  ],
  Accept: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'accept', value),
  ],
  Autocomplete: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'autocomplete', value),
  ],
  Pattern: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'pattern', value),
  ],
  Maxlength: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setNumericDataProp(ctx, 'maxLength', value),
  ],
  Minlength: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setNumericDataProp(ctx, 'minLength', value),
  ],
  Size: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'size', value),
  ],
  Cols: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'cols', value),
  ],
  Rows: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'rows', value),
  ],
  Max: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'max', value),
  ],
  Min: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'min', value),
  ],
  Step: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'step', value),
  ],
  For: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'htmlFor', value),
  ],
  Href: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataProp(ctx, 'href', sanitizeUrl(value)),
  ],
  Src: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataProp(ctx, 'src', sanitizeUrl(value)),
  ],
  Alt: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'alt', value),
  ],
  Target: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'target', value),
  ],
  Rel: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'rel', value),
  ],
  Download: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'download', value),
  ],
  Action: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataProp(ctx, 'action', sanitizeUrl(value)),
  ],
  Method: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'method', value),
  ],
  Enctype: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'enctype', value),
  ],
  Novalidate: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'noValidate', value),
  ],
  Formaction: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataProp(ctx, 'formAction', sanitizeUrl(value)),
  ],
  Formmethod: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'formMethod', value),
  ],
  Formnovalidate: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'formNoValidate', value),
  ],
  Formtarget: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'formTarget', value),
  ],
  Formenctype: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'formEnctype', value),
  ],
  Colspan: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'colSpan', value),
  ],
  Rowspan: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'rowSpan', value),
  ],
  Scope: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'scope', value),
  ],
  Headers: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'headers', value),
  ],
  Span: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'span', value),
  ],
  Start: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setNumericDataProp(ctx, 'start', value),
  ],
  Reversed: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'reversed', value),
  ],
  CiteAttr: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'cite', value),
  ],
  Datetime: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'dateTime', value),
  ],
  Wrap: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'wrap', value),
  ],
  List: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'list', value),
  ],
  FormAttr: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'form', value),
  ],
  LabelAttr: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'label', value),
  ],
  ContentAttr: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'content', value),
  ],
  Charset: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'charset', value),
  ],
  HttpEquiv: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'http-equiv', value),
  ],
  Srcset: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'srcset', value),
  ],
  Sizes: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'sizes', value),
  ],
  Loading: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'loading', value),
  ],
  Decoding: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'decoding', value),
  ],
  Fetchpriority: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fetchpriority', value),
  ],
  Crossorigin: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'crossorigin', value),
  ],
  Referrerpolicy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'referrerpolicy', value),
  ],
  Integrity: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'integrity', value),
  ],
  Hreflang: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'hreflang', value),
  ],
  Ping: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'ping', value),
  ],
  Sandbox: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'sandbox', value),
  ],
  Allow: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'allow', value),
  ],
  Srcdoc: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'srcdoc', value),
  ],
  Autoplay: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'autoplay', value),
  ],
  Controls: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'controls', value),
  ],
  Loop: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'loop', value),
  ],
  Muted: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      updatePropsWithPostpatch(ctx, 'muted', value),
  ],
  Poster: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'poster', value),
  ],
  Preload: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'preload', value),
  ],
  Playsinline: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'playsInline', value),
  ],
  High: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setFiniteNumericDataProp(ctx, 'high', value),
  ],
  Low: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setFiniteNumericDataProp(ctx, 'low', value),
  ],
  Optimum: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setFiniteNumericDataProp(ctx, 'optimum', value),
  ],
  Usemap: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'usemap', value),
  ],
  Ismap: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataProp(ctx, 'isMap', value),
  ],
  Role: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'role', value),
  ],
  AriaLabel: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-label', value),
  ],
  AriaLabelledBy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-labelledby', value),
  ],
  AriaDescribedBy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-describedby', value),
  ],
  AriaHidden: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-hidden', value.toString()),
  ],
  AriaExpanded: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-expanded', value.toString()),
  ],
  AriaSelected: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-selected', value.toString()),
  ],
  AriaChecked: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-checked', value.toString()),
  ],
  AriaDisabled: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-disabled', value.toString()),
  ],
  AriaRequired: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-required', value.toString()),
  ],
  AriaInvalid: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-invalid', value.toString()),
  ],
  AriaLive: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-live', value),
  ],
  AriaControls: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-controls', value),
  ],
  AriaCurrent: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-current', value),
  ],
  AriaOrientation: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-orientation', value),
  ],
  AriaPressed: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-pressed', value),
  ],
  AriaHasPopup: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-haspopup', value),
  ],
  AriaActiveDescendant: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-activedescendant', value),
  ],
  AriaSort: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-sort', value),
  ],
  AriaMultiSelectable: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-multiselectable', value.toString()),
  ],
  AriaModal: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-modal', value.toString()),
  ],
  AriaBusy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-busy', value.toString()),
  ],
  AriaErrorMessage: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-errormessage', value),
  ],
  AriaRoleDescription: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-roledescription', value),
  ],
  AriaAtomic: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-atomic', value.toString()),
  ],
  AriaAutocomplete: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-autocomplete', value),
  ],
  AriaColcount: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-colcount', value.toString()),
  ],
  AriaColindex: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-colindex', value.toString()),
  ],
  AriaColspan: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-colspan', value.toString()),
  ],
  AriaDescription: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-description', value),
  ],
  AriaDetails: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-details', value),
  ],
  AriaFlowto: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-flowto', value),
  ],
  AriaKeyshortcuts: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-keyshortcuts', value),
  ],
  AriaLevel: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-level', value.toString()),
  ],
  AriaOwns: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-owns', value),
  ],
  AriaPlaceholder: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-placeholder', value),
  ],
  AriaPosinset: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-posinset', value.toString()),
  ],
  AriaReadonly: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-readonly', value.toString()),
  ],
  AriaRelevant: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-relevant', value),
  ],
  AriaRowcount: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-rowcount', value.toString()),
  ],
  AriaRowindex: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-rowindex', value.toString()),
  ],
  AriaRowspan: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-rowspan', value.toString()),
  ],
  AriaSetsize: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-setsize', value.toString()),
  ],
  AriaValuemax: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-valuemax', value.toString()),
  ],
  AriaValuemin: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-valuemin', value.toString()),
  ],
  AriaValuenow: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'aria-valuenow', value.toString()),
  ],
  AriaValuetext: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'aria-valuetext', value),
  ],
  Attribute: [
    makeKeyValueAttribute,
    ({ key, value }, ctx: BuildContext) => setDataAttr(ctx, key, value),
  ],
  DataAttribute: [
    makeKeyValueAttribute,
    ({ key, value }, ctx: BuildContext) =>
      setDataAttr(ctx, `data-${key}`, value),
  ],
  Style: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setModuleData(
        ctx,
        'style',
        normalizedStyleProperties(value),
        VNodeDataMask.Style,
      ),
  ],
  InnerHTML: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setTrustedInnerHtml(ctx, value),
  ],
  ViewBox: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'viewBox', value),
  ],
  Xmlns: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'xmlns', value),
  ],
  Fill: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fill', value),
  ],
  FillRule: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fill-rule', value),
  ],
  ClipRule: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'clip-rule', value),
  ],
  Stroke: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'stroke', value),
  ],
  StrokeWidth: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'stroke-width', value),
  ],
  StrokeLinecap: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'stroke-linecap', value),
  ],
  StrokeLinejoin: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'stroke-linejoin', value),
  ],
  D: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'd', value),
  ],
  Cx: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'cx', value),
  ],
  Cy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'cy', value),
  ],
  R: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'r', value),
  ],
  X: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'x', value),
  ],
  Y: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'y', value),
  ],
  Width: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'width', value),
  ],
  Height: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'height', value),
  ],
  X1: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'x1', value),
  ],
  Y1: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'y1', value),
  ],
  X2: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'x2', value),
  ],
  Y2: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'y2', value),
  ],
  Points: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'points', value),
  ],
  Transform: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'transform', value),
  ],
  Opacity: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'opacity', value),
  ],
  StrokeDasharray: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'stroke-dasharray', value),
  ],
  StrokeDashoffset: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'stroke-dashoffset', value),
  ],
  Dx: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'dx', value),
  ],
  Dy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'dy', value),
  ],
  Rotate: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'rotate', value),
  ],
  TextAnchor: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'text-anchor', value),
  ],
  DominantBaseline: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'dominant-baseline', value),
  ],
  AlignmentBaseline: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'alignment-baseline', value),
  ],
  BaselineShift: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'baseline-shift', value),
  ],
  TextLength: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'textLength', value),
  ],
  LengthAdjust: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'lengthAdjust', value),
  ],
  FontFamily: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'font-family', value),
  ],
  FontSize: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'font-size', value),
  ],
  FontWeight: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'font-weight', value),
  ],
  FontStyle: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'font-style', value),
  ],
  LetterSpacing: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'letter-spacing', value),
  ],
  WordSpacing: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'word-spacing', value),
  ],
  TextDecoration: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'text-decoration', value),
  ],
  WritingMode: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'writing-mode', value),
  ],
  Rx: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'rx', value),
  ],
  Ry: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'ry', value),
  ],
  PathLength: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'pathLength', value),
  ],
  FillOpacity: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fill-opacity', value),
  ],
  StrokeOpacity: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'stroke-opacity', value),
  ],
  StrokeMiterlimit: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'stroke-miterlimit', value),
  ],
  PaintOrder: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'paint-order', value),
  ],
  VectorEffect: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'vector-effect', value),
  ],
  Color: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'color', value),
  ],
  Visibility: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'visibility', value),
  ],
  Display: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'display', value),
  ],
  Overflow: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'overflow', value),
  ],
  PointerEvents: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'pointer-events', value),
  ],
  Cursor: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'cursor', value),
  ],
  ShapeRendering: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'shape-rendering', value),
  ],
  TextRendering: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'text-rendering', value),
  ],
  ImageRendering: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'image-rendering', value),
  ],
  ClipPath: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'clip-path', value),
  ],
  Mask: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'mask', value),
  ],
  Filter: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'filter', value),
  ],
  ClipPathUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'clipPathUnits', value),
  ],
  MaskUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'maskUnits', value),
  ],
  MaskContentUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'maskContentUnits', value),
  ],
  FilterUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'filterUnits', value),
  ],
  PrimitiveUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'primitiveUnits', value),
  ],
  Offset: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'offset', value),
  ],
  StopColor: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'stop-color', value),
  ],
  StopOpacity: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'stop-opacity', value),
  ],
  GradientUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'gradientUnits', value),
  ],
  GradientTransform: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'gradientTransform', value),
  ],
  SpreadMethod: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'spreadMethod', value),
  ],
  Fx: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fx', value),
  ],
  Fy: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fy', value),
  ],
  Fr: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'fr', value),
  ],
  PatternUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'patternUnits', value),
  ],
  PatternContentUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'patternContentUnits', value),
  ],
  PatternTransform: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'patternTransform', value),
  ],
  MarkerStart: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'marker-start', value),
  ],
  MarkerMid: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'marker-mid', value),
  ],
  MarkerEnd: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'marker-end', value),
  ],
  MarkerWidth: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'markerWidth', value),
  ],
  MarkerHeight: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'markerHeight', value),
  ],
  MarkerUnits: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'markerUnits', value),
  ],
  RefX: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'refX', value),
  ],
  RefY: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'refY', value),
  ],
  Orient: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) => setDataAttr(ctx, 'orient', value),
  ],
  PreserveAspectRatio: [
    makeValueAttribute,
    ({ value }, ctx: BuildContext) =>
      setDataAttr(ctx, 'preserveAspectRatio', value),
  ],
  Prop: [
    undefined,
    ({ key, value }, ctx: BuildContext) =>
      setClientOnlyDataProp(ctx, key, value),
  ],
  OnCustomEvent: [
    undefined,
    ({ name, f: toMaybeMessage }, ctx: BuildContext) =>
      updateDataOn(ctx, {
        [name]: (event: Event) => {
          if (event instanceof CustomEvent) {
            const maybeMessage = toMaybeMessage(event)

            if (Option.isSome(maybeMessage)) {
              ctx.dispatch(maybeMessage.value)
            }
          }
        },
      }),
  ],
  OnMount: [
    makeMountAttribute,
    ({ action }, ctx) => {
      const existingMount: FoldkitMountMarker | undefined =
        ctx.data[FOLDKIT_MOUNT_KEY]

      if (existingMount !== undefined) {
        throw new Error(
          `[foldkit] An element can have only one OnMount attribute; received "${existingMount.name}" and "${action.name}". Combine both behaviors in one Mount.`,
        )
      }

      const capturedContext = ctx.getCapturedContext()
      const instance = Context.get(capturedContext, CurrentInstance)?.node
      const startBarrier = instance?.startBarrier
      const maybeTracker = Context.getOption(capturedContext, MountTracker)
      const maybeMountRuntime = Context.getOption(capturedContext, MountRuntime)
      const capturedMountDispatch =
        ctx.resolveMountDispatch ?? currentMountDispatchResolverOrUndefined()
      const resolveMountDispatch =
        capturedMountDispatch ??
        ({
          owner: 'Live',
          resolve: () => fallbackDispatch,
        } satisfies MountDispatchResolver)
      const notifyStarted = Option.isSome(maybeTracker)
        ? () => maybeTracker.value.started(action.name, action.args)
        : Function.constVoid
      const notifyEnded = Option.isSome(maybeTracker)
        ? () => maybeTracker.value.ended(action.name, action.args)
        : Function.constVoid
      const registration = action[MountRegistrationTypeId]
      const markerWithArgs: FoldkitMountMarker & MountOccurrence = {
        [MountOccurrencePathTypeId]: mountOccurrencePath(action),
        name: action.name,
        [InvocationIdentityTypeId]: invocationIdentity(action),
        [InvocationNameTypeId]: invocationName(action),
        ...(action.args !== undefined && { args: action.args }),
        ...(registration !== undefined && {
          [MountRegistrationTypeId]: registration,
        }),
      }
      const boundaryLift = ctx.boundaryMappers
      const marker: FoldkitMountMarker = Array.isReadonlyArrayEmpty(
        boundaryLift,
      )
        ? markerWithArgs
        : { ...markerWithArgs, messageMappers: boundaryLift }
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ;(ctx.data as Record<string, unknown>)[FOLDKIT_MOUNT_KEY] = marker
      if (capturedMountDispatch !== undefined) {
        captureMount(marker, {
          owner: instance,
          resolver: capturedMountDispatch,
        })
      }
      const existingDestroy = ctx.data.hook?.destroy
      ctx.data.hook = {
        ...ctx.data.hook,
        insert: vnode => {
          if (vnode.elm instanceof Element) {
            const element = vnode.elm
            acquireMount(element)
          }
        },
        postpatch: (_previousVNode, vnode) => {
          if (vnode.elm instanceof Element) {
            const state = onMountStates.get(vnode.elm)
            if (
              state !== undefined &&
              resolveMountDispatch.owner === 'Live' &&
              (state.owner === 'Replay' || state.instance !== instance)
            ) {
              releaseMount(state)
              acquireMount(vnode.elm, state.fiber)
            }
          }
        },
        destroy: vnode => {
          if (existingDestroy !== undefined) {
            existingDestroy(vnode)
          }
          if (vnode.elm instanceof Element) {
            cleanupMount(vnode.elm)
          }
        },
      }

      function releaseMount(state: OnMountState): void {
        state.lifecycle.isActive = false
        if (state.lifecycle.isStarted) {
          state.lifecycle.isStarted = false
          if (state.owner === 'Live') {
            state.notifyEnded()
          }
        }
      }

      function acquireMount(
        element: Element,
        previousFiber?: Fiber.Fiber<unknown, unknown>,
      ): void {
        const lifecycle: OnMountLifecycle = {
          isActive: true,
          isStarted: false,
        }
        const mountDispatch = resolveMountDispatch.resolve()
        const viewStateChanges = Option.match(maybeMountRuntime, {
          onNone: () => liveViewStateChanges,
          onSome: mountRuntime => mountRuntime.captureViewStateChanges(),
        })
        const startMount = Effect.suspend(() => {
          if (
            !lifecycle.isActive ||
            (startBarrier !== undefined && instance?.isActive !== true)
          ) {
            return Effect.void
          }
          if (!lifecycle.isStarted) {
            lifecycle.isStarted = true
            notifyStarted()
          }
          return Stream.runForEach(
            action.f(element, viewStateChanges),
            message =>
              Effect.sync(() => {
                if (lifecycle.isActive) {
                  mountDispatch(message)
                }
              }),
          )
        })
        const runMount = (startBarrier ?? Effect.void).pipe(
          Effect.andThen(startMount),
          Effect.catchCause(cause =>
            Effect.sync(() => {
              console.error(`[OnMount ${action.name}] unhandled failure`, cause)
            }),
          ),
        )
        const acquire =
          previousFiber === undefined
            ? runMount
            : Fiber.interrupt(previousFiber).pipe(Effect.andThen(runMount))
        const registeredAcquire = Effect.withFiber(fiber => {
          onMountStates.set(element, {
            fiber,
            lifecycle,
            notifyEnded,
            owner: resolveMountDispatch.owner,
            ...(instance === undefined ? {} : { instance }),
          })
          registerMountCleanup(element, () => {
            const state = onMountStates.get(element)
            if (state !== undefined) {
              releaseMount(state)
              Effect.runFork(Fiber.interrupt(state.fiber))
              onMountStates.delete(element)
            }
          })

          if (Option.isSome(maybeMountRuntime)) {
            maybeMountRuntime.value.registerFiber(fiber)
          }

          if (instance !== undefined) {
            instance.mounts.add(fiber)
            fiber.addObserver(() => {
              instance.mounts.delete(fiber)
            })
          }

          return acquire
        })
        Effect.runForkWith(capturedContext)(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          registeredAcquire as Effect.Effect<void>,
        )
      }
    },
  ],
  OnUnmount: [
    makeMessageAttribute,
    ({ message }, ctx: BuildContext) => {
      // NOTE: resolve the boundary wrapping chain eagerly, while the boundary
      // is still live this render. The dispatch runs during teardown, or later
      // after a failed replay patch, so the precomputed thunk does not depend
      // on what the registry holds at that time.
      const dispatchUnmount = ctx.resolveUnmount(message)
      attachOnUnmount(ctx.data, dispatchUnmount)
    },
  ],
}

// NOTE: resolve the shared definitions once, not in the render path. Each
// attribute still takes one tag lookup and one call when building a VNode.
const attributeHandlers = Record.map(attributeDefinitions, ([, apply]) => apply)

const applyAttribute = (
  attribute: TaggedAttribute<unknown>,
  ctx: BuildContext,
): void => {
  // NOTE: the mapped record type correlates each handler's attribute
  // parameter with its tag, which TypeScript cannot re-derive at this
  // widened call site.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const handler = attributeHandlers[attribute._tag] as (
    attribute: TaggedAttribute<unknown>,
    ctx: BuildContext,
  ) => void
  handler(attribute, ctx)
}

// NOTE: tolerate the absence of a runtime frame. Static elements
// (`h.code([h.Class('x')], ['text'])`) and prose fragments built at module
// top level (`const fragment = inlineCode('foo')` at import time) must
// construct without an active render frame. They never invoke the fallback
// dispatcher because they have no event handlers; event-bearing Html
// constructed outside a render reaches the fallback only at event-fire time,
// which surfaces a clear error rather than failing at import time. The
// fallbacks are module-level constants so element construction allocates no
// per-element closures for them.
const fallbackDispatch: DispatchSync = () => {
  throw new Error(
    'Foldkit: an event-bearing Html attribute fired without an ' +
      'active runtime frame. This typically means an Html element ' +
      'with event handlers (OnClick, OnInput, etc.) was constructed ' +
      'at module top level outside of a view function.',
  )
}

const fallbackUnmountResolver: UnmountResolver = () => () => {
  throw new Error(
    'Foldkit: an OnUnmount attribute fired without an active runtime ' +
      'frame. This typically means an Html element with OnUnmount was ' +
      'constructed at module top level outside of a view function.',
  )
}

const currentDispatchOrFallback = (): DispatchSync => {
  try {
    return requireDispatch()
  } catch {
    return fallbackDispatch
  }
}

const currentUnmountResolverOrFallback = (): UnmountResolver => {
  try {
    return requireUnmountResolver()
  } catch {
    return fallbackUnmountResolver
  }
}

const currentMountDispatchResolverOrUndefined = ():
  | MountDispatchResolver
  | undefined => {
  try {
    return requireMountDispatchResolver()
  } catch {
    return undefined
  }
}

const capturedContextOrEmpty = (): Context.Context<never> => {
  try {
    return requireRuntimeContext()
  } catch {
    return Context.empty()
  }
}

// NOTE: reasserted on `insert` as well as on `postpatch`. The props module sets
// a controlled property while the element is being created, before its children
// exist, and a `<select>`'s `value` setter has nothing to match against until
// its `<option>`s are there, so a fresh render left the select on the browser's
// own default until some later patch corrected it. The server instead marks the
// matching option, so the served page was right and the fresh one was not.
// `insert` fires once the subtree is built, which is where the two agree.
const applyControlledProps = (
  vnode: VNode,
  controlledProps: ReadonlyArray<
    Readonly<{ propName: string; value: unknown }>
  >,
): void => {
  if (!vnode.elm) {
    return
  }
  Array.forEach(controlledProps, ({ propName, value }) => {
    const isOutputValue =
      vnode.elm instanceof Element &&
      vnode.elm.localName === 'output' &&
      propName === 'value'
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    if (isOutputValue || (vnode.elm as any)[propName] !== value) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ;(vnode.elm as any)[propName] = value
    }
    if (vnode.elm instanceof Element) {
      synchronizeControlledDefault(vnode.elm, propName, value)
    }
  })
}

const attachPostpatchHook = (
  data: VNodeData,
  postpatchProps: ReadonlyArray<Readonly<{ propName: string; value: unknown }>>,
): void => {
  const existingInsert = data.hook?.insert
  const existingPostpatch = data.hook?.postpatch
  data.hook = {
    ...data.hook,
    insert: vnode => {
      applyControlledProps(vnode, postpatchProps)
      existingInsert?.(vnode)
    },
    postpatch: (oldVnode, vnode) => {
      applyControlledProps(vnode, postpatchProps)
      existingPostpatch?.(oldVnode, vnode)
    },
  }
}

const attachControlledContentOwnershipHook = (data: VNodeData): void => {
  const existingPostpatch = data.hook?.postpatch
  data.hook = {
    ...data.hook,
    postpatch: (oldVnode, vnode) => {
      existingPostpatch?.(oldVnode, vnode)
      const oldProperties = oldVnode.data?.props
      const properties = vnode.data?.props
      if (
        oldProperties !== undefined &&
        Object.hasOwn(oldProperties, 'value') &&
        (properties === undefined || !Object.hasOwn(properties, 'value')) &&
        vnode.elm instanceof Element
      ) {
        restoreUncontrolledContent(vnode.elm, vnode)
      }
    },
  }
}

const buildVNodeData = <Message, AllowedMountRequirements>(
  attributes: ReadonlyArray<Attribute<Message, AllowedMountRequirements>>,
): VNodeData => {
  const data: VNodeData = { [vnodeDataMaskKey]: 0 }
  if (attributes.length === 0) {
    return data
  }

  // NOTE: most attributes route through the current frame's dispatch.
  // ChildAttribute items carry a different dispatcher (captured by
  // `childAttributes` in a Block's own boundary), so they need their own
  // BuildContext closed over that dispatch. The handler record itself is
  // module-level and shared. The main ctx is built lazily. Static-only
  // attribute arrays (Class, Id, etc. with no event handlers) skip
  // `requireDispatch` entirely so Html can be constructed at module top
  // level. The boundary ctx map is only allocated when a ChildAttribute is
  // actually present.
  let mainCtx: BuildContext | undefined
  let boundaryCtxByDispatch: Map<DispatchSync, BuildContext> | undefined
  let sharedPostpatchProps:
    | Array<Readonly<{ propName: string; value: unknown }>>
    | undefined
  const getSharedPostpatchProps = (): Array<
    Readonly<{ propName: string; value: unknown }>
  > => (sharedPostpatchProps ??= [])

  for (const item of attributes) {
    if (isChildAttribute(item)) {
      boundaryCtxByDispatch ??= new Map()
      let ctx = boundaryCtxByDispatch.get(item.dispatch)
      if (
        ctx === undefined ||
        (item.resolveMountDispatch !== undefined &&
          ctx.resolveMountDispatch !== item.resolveMountDispatch) ||
        (item.mountContext !== undefined &&
          ctx.getCapturedContext() !== item.mountContext)
      ) {
        ctx = {
          data,
          getPostpatchProps: getSharedPostpatchProps,
          dispatch: item.dispatch,
          resolveUnmount: item.resolveUnmount,
          boundaryMappers: item.boundaryMappers,
          ...(item.resolveMountDispatch !== undefined && {
            resolveMountDispatch: item.resolveMountDispatch,
          }),
          getCapturedContext:
            item.mountContext === undefined
              ? capturedContextOrEmpty
              : () => item.mountContext!,
        }
        boundaryCtxByDispatch.set(item.dispatch, ctx)
      }
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      applyAttribute(item.attribute as TaggedAttribute<unknown>, ctx)
    } else {
      if (mainCtx === undefined) {
        mainCtx = {
          data,
          getPostpatchProps: getSharedPostpatchProps,
          dispatch: currentDispatchOrFallback(),
          resolveUnmount: currentUnmountResolverOrFallback(),
          boundaryMappers: requireBoundaryMappers(),
          getCapturedContext: capturedContextOrEmpty,
        }
      }
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      applyAttribute(item as TaggedAttribute<unknown>, mainCtx)
    }
  }

  if (
    sharedPostpatchProps !== undefined &&
    Array.isReadonlyArrayNonEmpty(sharedPostpatchProps)
  ) {
    attachPostpatchHook(data, sharedPostpatchProps)
  }

  return data
}

// NOTE: one fresh mutable array per element in a single pass: `h.empty`
// children (null) are dropped, and snabbdom's `h` converts primitive
// children to text vnodes in place, so the caller's array must never be
// handed over directly.
const copyChildrenDroppingEmpty = (
  children: ReadonlyArray<Child>,
): Array<VNode | string> => {
  const next: Array<VNode | string> = []
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (child !== null && child !== undefined) {
      next.push(child)
    }
  }
  return next
}

// Elements whose content a controlled `value` owns. Giving one both a value and
// trusted raw HTML asks two mechanisms to own the same text.
const CONTROLLED_CONTENT_ELEMENTS: ReadonlySet<string> = new Set([
  'output',
  'select',
  'textarea',
])

// Elements that carry no content at all, so raw HTML written into one cannot be
// represented in served markup. Assigning the property in a browser can still
// build child nodes, which is a difference no server render can reproduce.
const VOID_CONTENT_ELEMENTS: ReadonlySet<string> = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

// One owner per element's content. Both `h.InnerHTML` and a client-only
// `innerHTML` property hand the element an opaque subtree. A view that also
// declares children or a controlled value gives the differ child vnodes for
// nodes the property replaces, leaving those vnodes detached and making a later
// patch unable to restore the declared children. Trusted `h.InnerHTML` also
// disagrees with the server serializer in these combinations. Rejecting at the
// builder makes the server render, a fresh client render, and hydration refuse
// the same self-contradictory view.
const assertSingleContentOwner = (
  tagName: string,
  data: VNodeData,
  children: ReadonlyArray<Child>,
): void => {
  const lowerTagName = tagName.toLowerCase()
  if (
    (lowerTagName === 'textarea' || lowerTagName === 'output') &&
    data.props?.['value'] !== undefined &&
    children.length > 0
  ) {
    throw new Error(
      `[foldkit] <${lowerTagName}> was given both a controlled value and ` +
        'children. Both own the element content, so a property assignment ' +
        'replaces the child nodes the differ expects to patch. Keep one owner.',
    )
  }
  const properties = data.props
  if (properties === undefined || !Object.hasOwn(properties, 'innerHTML')) {
    return
  }
  const innerHtmlOwner = hasTrustedInnerHtml(properties)
    ? 'h.InnerHTML'
    : 'a client-only innerHTML property'
  if (lowerTagName === 'textarea') {
    throw new Error(
      `[foldkit] <textarea> was given ${innerHtmlOwner}. Textarea content ` +
        'must use h.Value because innerHTML stops updating the live value ' +
        'after the browser marks the field dirty. Remove the innerHTML owner.',
    )
  }
  if (children.length > 0) {
    throw new Error(
      `[foldkit] <${lowerTagName}> was given both ${innerHtmlOwner} and children. ` +
        'innerHTML owns the whole of an element\u2019s content, so the two ' +
        'cannot both describe it: server rendering emits the raw HTML alone ' +
        'for h.InnerHTML, while a browser property assignment replaces the ' +
        'nodes the differ expects to patch. Keep one content owner.',
    )
  }
  if (
    CONTROLLED_CONTENT_ELEMENTS.has(lowerTagName) &&
    data.props?.['value'] !== undefined
  ) {
    throw new Error(
      `[foldkit] <${lowerTagName}> was given both ${innerHtmlOwner} and a ` +
        'controlled value. Both own this element\u2019s content, and they ' +
        'disagree once the client reasserts the value. Keep one of them.',
    )
  }
  if (VOID_CONTENT_ELEMENTS.has(lowerTagName)) {
    throw new Error(
      `[foldkit] <${lowerTagName}> cannot hold content, so ${innerHtmlOwner} ` +
        'on it ' +
        'has no representation in served HTML. A browser can still build ' +
        'child nodes from the property, which no server render reproduces. ' +
        'Remove the innerHTML value.',
    )
  }
}

const assertSingleStyleOwner = (data: VNodeData): void => {
  if (
    data.style === undefined ||
    htmlAttributeValue(data.attrs, 'style') === undefined
  ) {
    return
  }
  throw new Error(
    '[foldkit] An element was given both h.Style and a raw ' +
      "h.Attribute('style', ...). They are two owners of one declaration " +
      'block, and CSS parsing can make one swallow or override the other. ' +
      'Keep all inline declarations in one of them.',
  )
}

// The state an element would be in once it exists, read from the tag, the raw
// attributes, and the typed properties together. A builder on its own cannot
// decide any of this: `h.Value` is a string on an input and a number on a
// meter, `type="file"` refuses the value an input takes everywhere else, and a
// raw attribute means nothing until something says which property claims the
// same name.
//
// Each rule below marks a view whose server render and fresh client render
// cannot agree. Refusing it where it is written is what makes the two, plus a
// hydration of the first by the second, fail the same way rather than diverge
// quietly.

// A number both a parser and an assignment read identically: ASCII digits, one
// optional leading minus, an optional fraction, an optional exponent. Anything
// else parts the two: `0x10` is 16 to `Number` and invalid to the parser, a
// leading `+` or surrounding whitespace is accepted by one and not the other,
// and `Infinity` throws on assignment while the attribute falls back to the
// element's default.
const DECIMAL_NUMBER = /^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$/
const DECIMAL_INTEGER = /^-?[0-9]+$/

// Properties the DOM defines as numbers on these elements and as strings
// elsewhere, so the same builder means different things depending on where it
// is written.
const DOUBLE_IDL_PROPERTIES: Readonly<Record<string, ReadonlySet<string>>> = {
  meter: new Set(['high', 'low', 'max', 'min', 'optimum', 'value']),
  progress: new Set(['max', 'value']),
}

const LONG_IDL_PROPERTIES: Readonly<Record<string, ReadonlySet<string>>> = {
  li: new Set(['value']),
}

const assertDoubleIdlValue = (
  tagName: string,
  propName: string,
  value: unknown,
): void => {
  const isRepresentable =
    typeof value === 'number'
      ? Number.isFinite(value)
      : typeof value === 'string' &&
        DECIMAL_NUMBER.test(value) &&
        Number.isFinite(Number(value))
  if (!isRepresentable) {
    throw new Error(
      `[foldkit] <${tagName}> reads ${propName} as a number, and ` +
        `${JSON.stringify(value)} is not one a browser reads the same way from ` +
        'markup and from a property assignment. Use a finite decimal number.',
    )
  }
}

const assertLongIdlValue = (
  tagName: string,
  propName: string,
  value: unknown,
): void => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && DECIMAL_INTEGER.test(value)
        ? Number(value)
        : Number.NaN
  if (
    !Number.isInteger(parsed) ||
    parsed < SIGNED_LONG_MINIMUM ||
    parsed > SIGNED_LONG_MAXIMUM
  ) {
    throw new Error(
      `[foldkit] <${tagName}> reads ${propName} as an integer, and ` +
        `${JSON.stringify(value)} is not one a browser reads the same way from ` +
        'markup and from a property assignment. Use an integer from ' +
        `${String(SIGNED_LONG_MINIMUM)} to ${String(SIGNED_LONG_MAXIMUM)}.`,
    )
  }
}

const effectiveInputType = (data: VNodeData): string | undefined => {
  const typed = data.props?.['type']
  if (typeof typed === 'string') {
    return typed.toLowerCase()
  }
  const raw = htmlAttributeValue(data.attrs, 'type')
  return typeof raw === 'string' ? raw.toLowerCase() : undefined
}

const assertElementStateIsRepresentable = (
  tagName: string,
  data: VNodeData,
): void => {
  const props = data.props
  if (props === undefined) {
    return
  }
  const lowerTagName = tagName.toLowerCase()
  const doubleIdl = DOUBLE_IDL_PROPERTIES[lowerTagName]
  const longIdl = LONG_IDL_PROPERTIES[lowerTagName]

  for (const propName of Object.keys(props)) {
    const value = props[propName]
    if (value === undefined || propName === 'innerHTML') {
      continue
    }
    if (doubleIdl?.has(propName) === true) {
      assertDoubleIdlValue(lowerTagName, propName, value)
    }
    if (longIdl?.has(propName) === true) {
      assertLongIdlValue(lowerTagName, propName, value)
    }
    if (lowerTagName === 'input' && propName === 'size' && value === 0) {
      throw new Error(
        numericPropertyRefusal(propName, value) +
          `Use an integer from 1 to ${String(SIGNED_LONG_MAXIMUM)} on an input.`,
      )
    }
    // A raw attribute and a typed builder that name the same attribute are two
    // owners of one piece of state, and their served form has no source
    // spelling. `h.Attribute('checked', '')` with `h.Checked(false)` serves no
    // attribute at all, so the served element has `defaultChecked` false while
    // a fresh render parses the attribute and has it true: `form.reset()`,
    // `:default`, and an attribute selector then read the two pages
    // differently. A client-only property carries no such claim, so a
    // `CustomElement.define` property never conflicts with an attribute.
    const attributeName = reflectedAttributeName(propName)
    if (
      attributeName !== undefined &&
      !isClientOnlyProperty(props, propName) &&
      htmlAttributeValue(data.attrs, attributeName) !== undefined
    ) {
      throw new Error(
        `[foldkit] <${lowerTagName}> was given both a typed ${propName} and a ` +
          `raw h.Attribute('${attributeName}', ...). They are two owners of ` +
          'one attribute, and the state they describe together has no spelling ' +
          'in served HTML: the property decides what is served while a fresh ' +
          'render parses the attribute as the default too. Keep one of them.',
      )
    }
  }

  if (lowerTagName === 'input' && effectiveInputType(data) === 'file') {
    const value = props['value']
    if (typeof value === 'string' && value !== '') {
      throw new Error(
        '[foldkit] <input type="file"> was given a value. A file input takes ' +
          'no value from markup or from the Model: the served attribute is ' +
          'ignored and assigning the property throws InvalidStateError, so the ' +
          'view crashes on a fresh render and on hydration. Drop the value.',
      )
    }
  }
}

// NOTE: A typed property on an HTML element whose native interface does not own it
// has always been a client-side expando. For example, RadioGroup deliberately
// includes `h.Type('button')` in an attribute bundle that consumers may spread
// onto a button, div, or span. Mark the wrong-element case as client-only so
// server rendering omits it and hydration applies the same expando a fresh
// render does, without turning a pre-existing client pattern into live markup.
const markUnreflectedHtmlPropertiesClientOnly = (
  tagName: string,
  data: VNodeData,
): void => {
  const props = data.props
  if (props === undefined) {
    return
  }
  for (const propName of Object.keys(props)) {
    if (
      reflectedAttributeName(propName) !== undefined &&
      !isHtmlPropertyRepresentable(tagName, propName)
    ) {
      markClientOnlyProperty(props, propName)
    }
  }
}

// The same question in SVG and MathML, where the answer is decided by the
// namespace rather than by the tag. A foreign element has none of the HTML
// interface members a typed builder writes, apart from the three measured to
// reflect there. Assigning `href` on an SVG `<a>` throws, since bundled code is
// strict and `SVGAElement.href` is readonly; assigning `title` sets an expando
// no attribute ever sees. The serializer would have written an attribute for
// both. Raw `h.Attribute` is the mechanism SVG and MathML use, and it behaves
// identically on both sides.
//
// The namespace is only known once the `svg` or `math` element that introduces
// it is built, because that is when it propagates down. The walk stops where
// the namespace stops, so an HTML integration point such as `<foreignObject>`
// keeps ordinary HTML rules for its content.
const assertForeignPropertiesAreRepresentable = (node: VNode): void => {
  const data = node.data
  if (data === undefined || data.ns === undefined) {
    return
  }
  const props = data.props
  if (props !== undefined) {
    for (const propName of Object.keys(props)) {
      if (
        props[propName] === undefined ||
        propName === 'innerHTML' ||
        FOREIGN_REPRESENTABLE_PROPERTIES.has(propName) ||
        reflectedAttributeName(propName) === undefined
      ) {
        continue
      }
      throw new Error(
        `[foldkit] <${tagNameFromSelector(node.sel ?? '')}> is in the SVG or ` +
          `MathML namespace, where ${propName} is not a property the element ` +
          'has. Assigning it on the client sets a value no attribute reflects, ' +
          'or throws outright, while server rendering writes the attribute, so ' +
          `the two disagree. Write it as h.Attribute('${propName}', ...), ` +
          'which foreign content reads the same way on both sides.',
      )
    }
  }
  for (const child of node.children ?? []) {
    if (typeof child !== 'string') {
      assertForeignPropertiesAreRepresentable(child)
    }
  }
}

const buildElement = (
  tagName: string,
  data: VNodeData,
  children: ReadonlyArray<Child>,
): Html => {
  const copiedChildren = copyChildrenDroppingEmpty(children)
  markUnreflectedHtmlPropertiesClientOnly(tagName, data)
  assertSingleContentOwner(tagName, data, copiedChildren)
  assertSingleStyleOwner(data)
  if (data.style !== undefined) {
    assertStyleIsRepresentable(data.style)
  }
  assertElementStateIsRepresentable(tagName, data)
  if (
    tagName.toLowerCase() === 'select' ||
    tagName.toLowerCase() === 'textarea' ||
    tagName.toLowerCase() === 'output'
  ) {
    attachControlledContentOwnershipHook(data)
  }
  const built = h(tagName, data, copiedChildren)
  assertForeignPropertiesAreRepresentable(built)
  return built
}

const createElement = <Message, AllowedMountRequirements>(
  tagName: string,
  attributes: ReadonlyArray<Attribute<Message, AllowedMountRequirements>> = [],
  children: ReadonlyArray<Child> = [],
): Html => buildElement(tagName, buildVNodeData(attributes), children)

const element =
  <Message, AllowedMountRequirements>() =>
  (tagName: TagName) =>
  (
    attributes: ReadonlyArray<
      Attribute<Message, AllowedMountRequirements>
    > = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

export const customElement =
  <Message, AllowedMountRequirements = never>() =>
  (tagName: string) =>
  (
    attributes: ReadonlyArray<
      Attribute<Message, AllowedMountRequirements>
    > = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

const voidElement =
  <Message, AllowedMountRequirements>() =>
  (tagName: TagName) =>
  (
    attributes: ReadonlyArray<
      Attribute<Message, AllowedMountRequirements>
    > = [],
  ): Html =>
    createElement(tagName, attributes, [])

const keyed =
  <Message, AllowedMountRequirements>(): KeyedFunction<
    Message,
    AllowedMountRequirements
  > =>
  (tagName: TagName) =>
  (
    key: PropertyKey,
    attributes: ReadonlyArray<
      Attribute<Message, AllowedMountRequirements>
    > = [],
    children: ReadonlyArray<Child> = [],
  ): Html => {
    const data = buildVNodeData(attributes)
    data.key = key
    return buildElement(tagName, data, children)
  }

type ElementFunction<Message, AllowedMountRequirements> = (
  attributes: ReadonlyArray<Attribute<Message, AllowedMountRequirements>>,
  children?: ReadonlyArray<Child>,
) => Html

type VoidElementFunction<Message, AllowedMountRequirements> = (
  attributes: ReadonlyArray<Attribute<Message, AllowedMountRequirements>>,
) => Html

/** An attribute accepted by textarea builders. Textarea content must use
 *  `h.Value`; innerHTML does not keep the live value tracking the Model after
 *  the field is dirty. */
export type TextareaAttribute<
  Message,
  AllowedMountRequirements = never,
> = Exclude<
  Attribute<Message, AllowedMountRequirements>,
  Readonly<{ _tag: 'InnerHTML' }>
>

type TextValueElementFunction<Message, AllowedMountRequirements> = (
  attributes: ReadonlyArray<
    TextareaAttribute<Message, AllowedMountRequirements>
  >,
) => Html

type KeyedElementFunction<Message, AllowedMountRequirements> = (
  key: PropertyKey,
  attributes?: ReadonlyArray<Attribute<Message, AllowedMountRequirements>>,
  children?: ReadonlyArray<Child>,
) => Html

type KeyedTextValueElementFunction<Message, AllowedMountRequirements> = (
  key: PropertyKey,
  attributes?: ReadonlyArray<
    TextareaAttribute<Message, AllowedMountRequirements>
  >,
) => Html

type KeyedFunction<Message, AllowedMountRequirements> = <Name extends TagName>(
  tagName: Name,
) => Name extends 'textarea'
  ? KeyedTextValueElementFunction<Message, AllowedMountRequirements>
  : KeyedElementFunction<Message, AllowedMountRequirements>

type HtmlElements<Message, AllowedMountRequirements> = {
  a: ElementFunction<Message, AllowedMountRequirements>
  abbr: ElementFunction<Message, AllowedMountRequirements>
  address: ElementFunction<Message, AllowedMountRequirements>
  area: VoidElementFunction<Message, AllowedMountRequirements>
  article: ElementFunction<Message, AllowedMountRequirements>
  aside: ElementFunction<Message, AllowedMountRequirements>
  audio: ElementFunction<Message, AllowedMountRequirements>
  b: ElementFunction<Message, AllowedMountRequirements>
  base: VoidElementFunction<Message, AllowedMountRequirements>
  bdi: ElementFunction<Message, AllowedMountRequirements>
  bdo: ElementFunction<Message, AllowedMountRequirements>
  blockquote: ElementFunction<Message, AllowedMountRequirements>
  body: ElementFunction<Message, AllowedMountRequirements>
  br: VoidElementFunction<Message, AllowedMountRequirements>
  button: ElementFunction<Message, AllowedMountRequirements>
  canvas: ElementFunction<Message, AllowedMountRequirements>
  caption: ElementFunction<Message, AllowedMountRequirements>
  cite: ElementFunction<Message, AllowedMountRequirements>
  code: ElementFunction<Message, AllowedMountRequirements>
  col: VoidElementFunction<Message, AllowedMountRequirements>
  colgroup: ElementFunction<Message, AllowedMountRequirements>
  data: ElementFunction<Message, AllowedMountRequirements>
  datalist: ElementFunction<Message, AllowedMountRequirements>
  dd: ElementFunction<Message, AllowedMountRequirements>
  del: ElementFunction<Message, AllowedMountRequirements>
  details: ElementFunction<Message, AllowedMountRequirements>
  dfn: ElementFunction<Message, AllowedMountRequirements>
  dialog: ElementFunction<Message, AllowedMountRequirements>
  div: ElementFunction<Message, AllowedMountRequirements>
  dl: ElementFunction<Message, AllowedMountRequirements>
  dt: ElementFunction<Message, AllowedMountRequirements>
  em: ElementFunction<Message, AllowedMountRequirements>
  embed: VoidElementFunction<Message, AllowedMountRequirements>
  fieldset: ElementFunction<Message, AllowedMountRequirements>
  figcaption: ElementFunction<Message, AllowedMountRequirements>
  figure: ElementFunction<Message, AllowedMountRequirements>
  footer: ElementFunction<Message, AllowedMountRequirements>
  form: ElementFunction<Message, AllowedMountRequirements>
  h1: ElementFunction<Message, AllowedMountRequirements>
  h2: ElementFunction<Message, AllowedMountRequirements>
  h3: ElementFunction<Message, AllowedMountRequirements>
  h4: ElementFunction<Message, AllowedMountRequirements>
  h5: ElementFunction<Message, AllowedMountRequirements>
  h6: ElementFunction<Message, AllowedMountRequirements>
  head: ElementFunction<Message, AllowedMountRequirements>
  header: ElementFunction<Message, AllowedMountRequirements>
  hgroup: ElementFunction<Message, AllowedMountRequirements>
  hr: VoidElementFunction<Message, AllowedMountRequirements>
  html: ElementFunction<Message, AllowedMountRequirements>
  i: ElementFunction<Message, AllowedMountRequirements>
  iframe: ElementFunction<Message, AllowedMountRequirements>
  img: VoidElementFunction<Message, AllowedMountRequirements>
  input: VoidElementFunction<Message, AllowedMountRequirements>
  ins: ElementFunction<Message, AllowedMountRequirements>
  kbd: ElementFunction<Message, AllowedMountRequirements>
  label: ElementFunction<Message, AllowedMountRequirements>
  legend: ElementFunction<Message, AllowedMountRequirements>
  li: ElementFunction<Message, AllowedMountRequirements>
  link: VoidElementFunction<Message, AllowedMountRequirements>
  main: ElementFunction<Message, AllowedMountRequirements>
  map: ElementFunction<Message, AllowedMountRequirements>
  mark: ElementFunction<Message, AllowedMountRequirements>
  menu: ElementFunction<Message, AllowedMountRequirements>
  meta: VoidElementFunction<Message, AllowedMountRequirements>
  meter: ElementFunction<Message, AllowedMountRequirements>
  nav: ElementFunction<Message, AllowedMountRequirements>
  noscript: ElementFunction<Message, AllowedMountRequirements>
  object: ElementFunction<Message, AllowedMountRequirements>
  ol: ElementFunction<Message, AllowedMountRequirements>
  optgroup: ElementFunction<Message, AllowedMountRequirements>
  option: ElementFunction<Message, AllowedMountRequirements>
  output: ElementFunction<Message, AllowedMountRequirements>
  p: ElementFunction<Message, AllowedMountRequirements>
  picture: ElementFunction<Message, AllowedMountRequirements>
  portal: ElementFunction<Message, AllowedMountRequirements>
  pre: ElementFunction<Message, AllowedMountRequirements>
  progress: ElementFunction<Message, AllowedMountRequirements>
  q: ElementFunction<Message, AllowedMountRequirements>
  rp: ElementFunction<Message, AllowedMountRequirements>
  rt: ElementFunction<Message, AllowedMountRequirements>
  ruby: ElementFunction<Message, AllowedMountRequirements>
  s: ElementFunction<Message, AllowedMountRequirements>
  samp: ElementFunction<Message, AllowedMountRequirements>
  script: ElementFunction<Message, AllowedMountRequirements>
  search: ElementFunction<Message, AllowedMountRequirements>
  section: ElementFunction<Message, AllowedMountRequirements>
  select: ElementFunction<Message, AllowedMountRequirements>
  slot: ElementFunction<Message, AllowedMountRequirements>
  small: ElementFunction<Message, AllowedMountRequirements>
  source: VoidElementFunction<Message, AllowedMountRequirements>
  span: ElementFunction<Message, AllowedMountRequirements>
  strong: ElementFunction<Message, AllowedMountRequirements>
  style: ElementFunction<Message, AllowedMountRequirements>
  sub: ElementFunction<Message, AllowedMountRequirements>
  summary: ElementFunction<Message, AllowedMountRequirements>
  sup: ElementFunction<Message, AllowedMountRequirements>
  table: ElementFunction<Message, AllowedMountRequirements>
  tbody: ElementFunction<Message, AllowedMountRequirements>
  td: ElementFunction<Message, AllowedMountRequirements>
  template: ElementFunction<Message, AllowedMountRequirements>
  textarea: TextValueElementFunction<Message, AllowedMountRequirements>
  tfoot: ElementFunction<Message, AllowedMountRequirements>
  th: ElementFunction<Message, AllowedMountRequirements>
  thead: ElementFunction<Message, AllowedMountRequirements>
  time: ElementFunction<Message, AllowedMountRequirements>
  title: ElementFunction<Message, AllowedMountRequirements>
  tr: ElementFunction<Message, AllowedMountRequirements>
  track: VoidElementFunction<Message, AllowedMountRequirements>
  u: ElementFunction<Message, AllowedMountRequirements>
  ul: ElementFunction<Message, AllowedMountRequirements>
  var: ElementFunction<Message, AllowedMountRequirements>
  video: ElementFunction<Message, AllowedMountRequirements>
  wbr: VoidElementFunction<Message, AllowedMountRequirements>
  svg: ElementFunction<Message, AllowedMountRequirements>
  animate: ElementFunction<Message, AllowedMountRequirements>
  animateMotion: ElementFunction<Message, AllowedMountRequirements>
  animateTransform: ElementFunction<Message, AllowedMountRequirements>
  circle: ElementFunction<Message, AllowedMountRequirements>
  clipPath: ElementFunction<Message, AllowedMountRequirements>
  defs: ElementFunction<Message, AllowedMountRequirements>
  desc: ElementFunction<Message, AllowedMountRequirements>
  ellipse: ElementFunction<Message, AllowedMountRequirements>
  feBlend: ElementFunction<Message, AllowedMountRequirements>
  feColorMatrix: ElementFunction<Message, AllowedMountRequirements>
  feComponentTransfer: ElementFunction<Message, AllowedMountRequirements>
  feComposite: ElementFunction<Message, AllowedMountRequirements>
  feConvolveMatrix: ElementFunction<Message, AllowedMountRequirements>
  feDiffuseLighting: ElementFunction<Message, AllowedMountRequirements>
  feDisplacementMap: ElementFunction<Message, AllowedMountRequirements>
  feDistantLight: ElementFunction<Message, AllowedMountRequirements>
  feDropShadow: ElementFunction<Message, AllowedMountRequirements>
  feFlood: ElementFunction<Message, AllowedMountRequirements>
  feFuncA: ElementFunction<Message, AllowedMountRequirements>
  feFuncB: ElementFunction<Message, AllowedMountRequirements>
  feFuncG: ElementFunction<Message, AllowedMountRequirements>
  feFuncR: ElementFunction<Message, AllowedMountRequirements>
  feGaussianBlur: ElementFunction<Message, AllowedMountRequirements>
  feImage: ElementFunction<Message, AllowedMountRequirements>
  feMerge: ElementFunction<Message, AllowedMountRequirements>
  feMergeNode: ElementFunction<Message, AllowedMountRequirements>
  feMorphology: ElementFunction<Message, AllowedMountRequirements>
  feOffset: ElementFunction<Message, AllowedMountRequirements>
  fePointLight: ElementFunction<Message, AllowedMountRequirements>
  feSpecularLighting: ElementFunction<Message, AllowedMountRequirements>
  feSpotLight: ElementFunction<Message, AllowedMountRequirements>
  feTile: ElementFunction<Message, AllowedMountRequirements>
  feTurbulence: ElementFunction<Message, AllowedMountRequirements>
  filter: ElementFunction<Message, AllowedMountRequirements>
  foreignObject: ElementFunction<Message, AllowedMountRequirements>
  g: ElementFunction<Message, AllowedMountRequirements>
  image: ElementFunction<Message, AllowedMountRequirements>
  line: ElementFunction<Message, AllowedMountRequirements>
  linearGradient: ElementFunction<Message, AllowedMountRequirements>
  marker: ElementFunction<Message, AllowedMountRequirements>
  mask: ElementFunction<Message, AllowedMountRequirements>
  metadata: ElementFunction<Message, AllowedMountRequirements>
  mpath: ElementFunction<Message, AllowedMountRequirements>
  path: ElementFunction<Message, AllowedMountRequirements>
  pattern: ElementFunction<Message, AllowedMountRequirements>
  polygon: ElementFunction<Message, AllowedMountRequirements>
  polyline: ElementFunction<Message, AllowedMountRequirements>
  radialGradient: ElementFunction<Message, AllowedMountRequirements>
  rect: ElementFunction<Message, AllowedMountRequirements>
  set: ElementFunction<Message, AllowedMountRequirements>
  stop: ElementFunction<Message, AllowedMountRequirements>
  switch: ElementFunction<Message, AllowedMountRequirements>
  symbol: ElementFunction<Message, AllowedMountRequirements>
  text: ElementFunction<Message, AllowedMountRequirements>
  textPath: ElementFunction<Message, AllowedMountRequirements>
  tspan: ElementFunction<Message, AllowedMountRequirements>
  use: ElementFunction<Message, AllowedMountRequirements>
  view: ElementFunction<Message, AllowedMountRequirements>
  math: ElementFunction<Message, AllowedMountRequirements>
  annotation: ElementFunction<Message, AllowedMountRequirements>
  'annotation-xml': ElementFunction<Message, AllowedMountRequirements>
  maction: ElementFunction<Message, AllowedMountRequirements>
  menclose: ElementFunction<Message, AllowedMountRequirements>
  merror: ElementFunction<Message, AllowedMountRequirements>
  mfenced: ElementFunction<Message, AllowedMountRequirements>
  mfrac: ElementFunction<Message, AllowedMountRequirements>
  mglyph: ElementFunction<Message, AllowedMountRequirements>
  mi: ElementFunction<Message, AllowedMountRequirements>
  mlabeledtr: ElementFunction<Message, AllowedMountRequirements>
  mlongdiv: ElementFunction<Message, AllowedMountRequirements>
  mmultiscripts: ElementFunction<Message, AllowedMountRequirements>
  mn: ElementFunction<Message, AllowedMountRequirements>
  mo: ElementFunction<Message, AllowedMountRequirements>
  mover: ElementFunction<Message, AllowedMountRequirements>
  mpadded: ElementFunction<Message, AllowedMountRequirements>
  mphantom: ElementFunction<Message, AllowedMountRequirements>
  mprescripts: ElementFunction<Message, AllowedMountRequirements>
  mroot: ElementFunction<Message, AllowedMountRequirements>
  mrow: ElementFunction<Message, AllowedMountRequirements>
  ms: ElementFunction<Message, AllowedMountRequirements>
  mscarries: ElementFunction<Message, AllowedMountRequirements>
  mscarry: ElementFunction<Message, AllowedMountRequirements>
  msgroup: ElementFunction<Message, AllowedMountRequirements>
  msline: ElementFunction<Message, AllowedMountRequirements>
  mspace: ElementFunction<Message, AllowedMountRequirements>
  msqrt: ElementFunction<Message, AllowedMountRequirements>
  msrow: ElementFunction<Message, AllowedMountRequirements>
  mstack: ElementFunction<Message, AllowedMountRequirements>
  mstyle: ElementFunction<Message, AllowedMountRequirements>
  msub: ElementFunction<Message, AllowedMountRequirements>
  msubsup: ElementFunction<Message, AllowedMountRequirements>
  msup: ElementFunction<Message, AllowedMountRequirements>
  mtable: ElementFunction<Message, AllowedMountRequirements>
  mtd: ElementFunction<Message, AllowedMountRequirements>
  mtext: ElementFunction<Message, AllowedMountRequirements>
  mtr: ElementFunction<Message, AllowedMountRequirements>
  munder: ElementFunction<Message, AllowedMountRequirements>
  munderover: ElementFunction<Message, AllowedMountRequirements>
  semantics: ElementFunction<Message, AllowedMountRequirements>
}

type VoidElementTag =
  | 'area'
  | 'base'
  | 'br'
  | 'col'
  | 'embed'
  | 'hr'
  | 'img'
  | 'input'
  | 'link'
  | 'meta'
  | 'source'
  | 'track'
  | 'wbr'

type ElementDefinitions = {
  readonly [
    Tag in keyof HtmlElements<unknown, unknown>
  ]: Tag extends VoidElementTag ? true : false
}

const elementDefinitions = {
  a: false,
  abbr: false,
  address: false,
  area: true,
  article: false,
  aside: false,
  audio: false,
  b: false,
  base: true,
  bdi: false,
  bdo: false,
  blockquote: false,
  body: false,
  br: true,
  button: false,
  canvas: false,
  caption: false,
  cite: false,
  code: false,
  col: true,
  colgroup: false,
  data: false,
  datalist: false,
  dd: false,
  del: false,
  details: false,
  dfn: false,
  dialog: false,
  div: false,
  dl: false,
  dt: false,
  em: false,
  embed: true,
  fieldset: false,
  figcaption: false,
  figure: false,
  footer: false,
  form: false,
  h1: false,
  h2: false,
  h3: false,
  h4: false,
  h5: false,
  h6: false,
  head: false,
  header: false,
  hgroup: false,
  hr: true,
  html: false,
  i: false,
  iframe: false,
  img: true,
  input: true,
  ins: false,
  kbd: false,
  label: false,
  legend: false,
  li: false,
  link: true,
  main: false,
  map: false,
  mark: false,
  menu: false,
  meta: true,
  meter: false,
  nav: false,
  noscript: false,
  object: false,
  ol: false,
  optgroup: false,
  option: false,
  output: false,
  p: false,
  picture: false,
  portal: false,
  pre: false,
  progress: false,
  q: false,
  rp: false,
  rt: false,
  ruby: false,
  s: false,
  samp: false,
  script: false,
  search: false,
  section: false,
  select: false,
  slot: false,
  small: false,
  source: true,
  span: false,
  strong: false,
  style: false,
  sub: false,
  summary: false,
  sup: false,
  table: false,
  tbody: false,
  td: false,
  template: false,
  textarea: false,
  tfoot: false,
  th: false,
  thead: false,
  time: false,
  title: false,
  tr: false,
  track: true,
  u: false,
  ul: false,
  var: false,
  video: false,
  wbr: true,
  svg: false,
  animate: false,
  animateMotion: false,
  animateTransform: false,
  circle: false,
  clipPath: false,
  defs: false,
  desc: false,
  ellipse: false,
  feBlend: false,
  feColorMatrix: false,
  feComponentTransfer: false,
  feComposite: false,
  feConvolveMatrix: false,
  feDiffuseLighting: false,
  feDisplacementMap: false,
  feDistantLight: false,
  feDropShadow: false,
  feFlood: false,
  feFuncA: false,
  feFuncB: false,
  feFuncG: false,
  feFuncR: false,
  feGaussianBlur: false,
  feImage: false,
  feMerge: false,
  feMergeNode: false,
  feMorphology: false,
  feOffset: false,
  fePointLight: false,
  feSpecularLighting: false,
  feSpotLight: false,
  feTile: false,
  feTurbulence: false,
  filter: false,
  foreignObject: false,
  g: false,
  image: false,
  line: false,
  linearGradient: false,
  marker: false,
  mask: false,
  metadata: false,
  mpath: false,
  path: false,
  pattern: false,
  polygon: false,
  polyline: false,
  radialGradient: false,
  rect: false,
  set: false,
  stop: false,
  switch: false,
  symbol: false,
  text: false,
  textPath: false,
  tspan: false,
  use: false,
  view: false,
  math: false,
  annotation: false,
  'annotation-xml': false,
  maction: false,
  menclose: false,
  merror: false,
  mfenced: false,
  mfrac: false,
  mglyph: false,
  mi: false,
  mlabeledtr: false,
  mlongdiv: false,
  mmultiscripts: false,
  mn: false,
  mo: false,
  mover: false,
  mpadded: false,
  mphantom: false,
  mprescripts: false,
  mroot: false,
  mrow: false,
  ms: false,
  mscarries: false,
  mscarry: false,
  msgroup: false,
  msline: false,
  mspace: false,
  msqrt: false,
  msrow: false,
  mstack: false,
  mstyle: false,
  msub: false,
  msubsup: false,
  msup: false,
  mtable: false,
  mtd: false,
  mtext: false,
  mtr: false,
  munder: false,
  munderover: false,
  semantics: false,
} satisfies ElementDefinitions

const htmlElements = <Message, AllowedMountRequirements>(): HtmlElements<
  Message,
  AllowedMountRequirements
> => {
  const el = element<Message, AllowedMountRequirements>()
  const voidEl = voidElement<Message, AllowedMountRequirements>()
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Record.map(elementDefinitions, (isVoid, tag) =>
    isVoid ? voidEl(tag) : el(tag),
  ) as HtmlElements<Message, AllowedMountRequirements>
}

type HtmlAttributes<Message, AllowedMountRequirements> = {
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
  /** Dispatches `message` when the element is clicked. The optional controls
   *  can synchronously prevent the browser default, stop DOM propagation, and
   *  focus an existing element before dispatch. Omitted controls preserve the
   *  existing allow-and-bubble behavior.
   *
   *  `propagation: 'Stop'` still lets every click handler registered on the
   *  current element run, matching `Event.stopPropagation()`. It only prevents
   *  ancestor handlers from receiving the click.
   *
   *  `focusSelector` is for browser APIs that require focus during the
   *  originating user gesture, such as opening the iOS on-screen keyboard. The
   *  target must already exist. If the real input mounts after the Message
   *  changes the view, focus an always-present warmup input here, then return a
   *  `Dom.focus` Command from update to transfer focus after the real input
   *  mounts.
   *
   *  @example
   *  ```typescript
   *  h.OnClick(Message.ClickedExpand(), {
   *    defaultAction: 'Prevent',
   *    propagation: 'Stop',
   *  })
   *  ``` */
  OnClick: (
    message: Message,
    options?: ClickOptions,
  ) => {
    readonly _tag: 'OnClick'
    readonly message: Message
    readonly options?: ClickOptions
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
    toMaybeMessage: (
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
  OnPointerLeave: (
    toMaybeMessage: (pointerType: string) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnPointerLeave'
    readonly f: (pointerType: string) => Option.Option<Message>
  }
  /** Dispatches an optional Message on pointerdown. The final callback
   *  arguments identify the pointer and its originating target, so a parent
   *  gesture handler can distinguish touches and ignore nested controls. */
  OnPointerDown: (
    toMaybeMessage: (
      pointerType: string,
      button: number,
      screenX: number,
      screenY: number,
      timeStamp: number,
      clientX: number,
      clientY: number,
      pointerId: number,
      target: EventTarget | null,
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
      pointerId: number,
      target: EventTarget | null,
    ) => Option.Option<Message>
  }
  OnPointerUp: (
    toMaybeMessage: (
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
  OnKeyDown: (
    toMessage: (key: string, modifiers: KeyboardModifiers) => Message,
  ) => {
    readonly _tag: 'OnKeyDown'
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyDownFocus: (
    toMaybeFocusAndMessage: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Readonly<{ focusSelector: string; message: Message }>>,
  ) => {
    readonly _tag: 'OnKeyDownFocus'
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Readonly<{ focusSelector: string; message: Message }>>
  }
  OnKeyDownPreventDefault: (
    toMaybeMessage: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnKeyDownPreventDefault'
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyDownSelf: (
    toMessage: (key: string, modifiers: KeyboardModifiers) => Message,
  ) => {
    readonly _tag: 'OnKeyDownSelf'
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyDownSelfPreventDefault: (
    toMaybeMessage: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnKeyDownSelfPreventDefault'
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyUp: (
    toMessage: (key: string, modifiers: KeyboardModifiers) => Message,
  ) => {
    readonly _tag: 'OnKeyUp'
    readonly f: (key: string, modifiers: KeyboardModifiers) => Message
  }
  OnKeyUpPreventDefault: (
    toMaybeMessage: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnKeyUpPreventDefault'
    readonly f: (
      key: string,
      modifiers: KeyboardModifiers,
    ) => Option.Option<Message>
  }
  OnKeyPress: (
    toMessage: (key: string, modifiers: KeyboardModifiers) => Message,
  ) => {
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
  /**
   * Dispatches `message` when focus enters this element's subtree from
   * outside it. Moving focus between descendants does not dispatch.
   *
   * This uses the bubbling `focusin` event, so the element itself does not
   * need to be focusable. Pair it with {@link OnFocusLeave} to model whether
   * a compound region such as an editor and its toolbar contains focus.
   */
  OnFocusEnter: (message: Message) => {
    readonly _tag: 'OnFocusEnter'
    readonly message: Message
  }
  /**
   * Dispatches `message` when focus leaves this element's subtree. Moving
   * focus between descendants does not dispatch.
   *
   * This uses the bubbling `focusout` event and compares its related target
   * with the current element. The element itself does not need to be
   * focusable. Pair it with {@link OnFocusEnter} to model whether a compound
   * region such as an editor and its toolbar contains focus.
   */
  OnFocusLeave: (message: Message) => {
    readonly _tag: 'OnFocusLeave'
    readonly message: Message
  }
  OnInput: (toMessage: (value: string) => Message) => {
    readonly _tag: 'OnInput'
    readonly f: (value: string) => Message
  }
  OnChange: (toMessage: (value: string) => Message) => {
    readonly _tag: 'OnChange'
    readonly f: (value: string) => Message
  }
  OnBeforeInput: (
    toMessage: (inputType: string, data: Option.Option<string>) => Message,
  ) => {
    readonly _tag: 'OnBeforeInput'
    readonly f: (inputType: string, data: Option.Option<string>) => Message
  }
  OnBeforeInputPreventDefault: (
    toMaybeMessage: (
      inputType: string,
      data: Option.Option<string>,
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnBeforeInputPreventDefault'
    readonly f: (
      inputType: string,
      data: Option.Option<string>,
    ) => Option.Option<Message>
  }
  OnFileChange: (toMessage: (files: ReadonlyArray<File>) => Message) => {
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
  OnScroll: (toMessage: (scrollTop: number) => Message) => {
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
  OnPastePreventDefault: (
    toMaybeMessage: (text: string) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnPastePreventDefault'
    readonly f: (text: string) => Option.Option<Message>
  }
  OnCopyText: (text: string) => {
    readonly _tag: 'OnCopyText'
    readonly text: string
  }
  OnCutText: (
    text: string,
    message: Message,
  ) => {
    readonly _tag: 'OnCutText'
    readonly text: string
    readonly message: Message
  }
  OnCancel: (message: Message) => {
    readonly _tag: 'OnCancel'
    readonly message: Message
  }
  /** Prevents the default action of a `cancel` event. When a
   *  `customEventMessage` is provided, dispatches it only for a `CustomEvent`,
   *  allowing a synthetic cancel signal to be distinguished from the native
   *  event. Native `cancel` events never dispatch a Message. */
  OnCancelPreventDefault: (customEventMessage?: Message) => {
    readonly _tag: 'OnCancelPreventDefault'
    readonly maybeCustomEventMessage: Option.Option<Message>
  }
  OnToggle: (toMessage: (isOpen: boolean) => Message) => {
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
  OnDropFiles: (toMessage: (files: ReadonlyArray<File>) => Message) => {
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
  Dx: (value: string) => { readonly _tag: 'Dx'; readonly value: string }
  Dy: (value: string) => { readonly _tag: 'Dy'; readonly value: string }
  Rotate: (value: string) => { readonly _tag: 'Rotate'; readonly value: string }
  TextAnchor: (value: string) => {
    readonly _tag: 'TextAnchor'
    readonly value: string
  }
  DominantBaseline: (value: string) => {
    readonly _tag: 'DominantBaseline'
    readonly value: string
  }
  AlignmentBaseline: (value: string) => {
    readonly _tag: 'AlignmentBaseline'
    readonly value: string
  }
  BaselineShift: (value: string) => {
    readonly _tag: 'BaselineShift'
    readonly value: string
  }
  TextLength: (value: string) => {
    readonly _tag: 'TextLength'
    readonly value: string
  }
  LengthAdjust: (value: string) => {
    readonly _tag: 'LengthAdjust'
    readonly value: string
  }
  FontFamily: (value: string) => {
    readonly _tag: 'FontFamily'
    readonly value: string
  }
  FontSize: (value: string) => {
    readonly _tag: 'FontSize'
    readonly value: string
  }
  FontWeight: (value: string) => {
    readonly _tag: 'FontWeight'
    readonly value: string
  }
  FontStyle: (value: string) => {
    readonly _tag: 'FontStyle'
    readonly value: string
  }
  LetterSpacing: (value: string) => {
    readonly _tag: 'LetterSpacing'
    readonly value: string
  }
  WordSpacing: (value: string) => {
    readonly _tag: 'WordSpacing'
    readonly value: string
  }
  TextDecoration: (value: string) => {
    readonly _tag: 'TextDecoration'
    readonly value: string
  }
  WritingMode: (value: string) => {
    readonly _tag: 'WritingMode'
    readonly value: string
  }
  Rx: (value: string) => { readonly _tag: 'Rx'; readonly value: string }
  Ry: (value: string) => { readonly _tag: 'Ry'; readonly value: string }
  PathLength: (value: string) => {
    readonly _tag: 'PathLength'
    readonly value: string
  }
  FillOpacity: (value: string) => {
    readonly _tag: 'FillOpacity'
    readonly value: string
  }
  StrokeOpacity: (value: string) => {
    readonly _tag: 'StrokeOpacity'
    readonly value: string
  }
  StrokeMiterlimit: (value: string) => {
    readonly _tag: 'StrokeMiterlimit'
    readonly value: string
  }
  PaintOrder: (value: string) => {
    readonly _tag: 'PaintOrder'
    readonly value: string
  }
  VectorEffect: (value: string) => {
    readonly _tag: 'VectorEffect'
    readonly value: string
  }
  Color: (value: string) => { readonly _tag: 'Color'; readonly value: string }
  Visibility: (value: string) => {
    readonly _tag: 'Visibility'
    readonly value: string
  }
  Display: (value: string) => {
    readonly _tag: 'Display'
    readonly value: string
  }
  Overflow: (value: string) => {
    readonly _tag: 'Overflow'
    readonly value: string
  }
  PointerEvents: (value: string) => {
    readonly _tag: 'PointerEvents'
    readonly value: string
  }
  Cursor: (value: string) => { readonly _tag: 'Cursor'; readonly value: string }
  ShapeRendering: (value: string) => {
    readonly _tag: 'ShapeRendering'
    readonly value: string
  }
  TextRendering: (value: string) => {
    readonly _tag: 'TextRendering'
    readonly value: string
  }
  ImageRendering: (value: string) => {
    readonly _tag: 'ImageRendering'
    readonly value: string
  }
  ClipPath: (value: string) => {
    readonly _tag: 'ClipPath'
    readonly value: string
  }
  Mask: (value: string) => { readonly _tag: 'Mask'; readonly value: string }
  Filter: (value: string) => { readonly _tag: 'Filter'; readonly value: string }
  ClipPathUnits: (value: string) => {
    readonly _tag: 'ClipPathUnits'
    readonly value: string
  }
  MaskUnits: (value: string) => {
    readonly _tag: 'MaskUnits'
    readonly value: string
  }
  MaskContentUnits: (value: string) => {
    readonly _tag: 'MaskContentUnits'
    readonly value: string
  }
  FilterUnits: (value: string) => {
    readonly _tag: 'FilterUnits'
    readonly value: string
  }
  PrimitiveUnits: (value: string) => {
    readonly _tag: 'PrimitiveUnits'
    readonly value: string
  }
  Offset: (value: string) => { readonly _tag: 'Offset'; readonly value: string }
  StopColor: (value: string) => {
    readonly _tag: 'StopColor'
    readonly value: string
  }
  StopOpacity: (value: string) => {
    readonly _tag: 'StopOpacity'
    readonly value: string
  }
  GradientUnits: (value: string) => {
    readonly _tag: 'GradientUnits'
    readonly value: string
  }
  GradientTransform: (value: string) => {
    readonly _tag: 'GradientTransform'
    readonly value: string
  }
  SpreadMethod: (value: string) => {
    readonly _tag: 'SpreadMethod'
    readonly value: string
  }
  Fx: (value: string) => { readonly _tag: 'Fx'; readonly value: string }
  Fy: (value: string) => { readonly _tag: 'Fy'; readonly value: string }
  Fr: (value: string) => { readonly _tag: 'Fr'; readonly value: string }
  PatternUnits: (value: string) => {
    readonly _tag: 'PatternUnits'
    readonly value: string
  }
  PatternContentUnits: (value: string) => {
    readonly _tag: 'PatternContentUnits'
    readonly value: string
  }
  PatternTransform: (value: string) => {
    readonly _tag: 'PatternTransform'
    readonly value: string
  }
  MarkerStart: (value: string) => {
    readonly _tag: 'MarkerStart'
    readonly value: string
  }
  MarkerMid: (value: string) => {
    readonly _tag: 'MarkerMid'
    readonly value: string
  }
  MarkerEnd: (value: string) => {
    readonly _tag: 'MarkerEnd'
    readonly value: string
  }
  MarkerWidth: (value: string) => {
    readonly _tag: 'MarkerWidth'
    readonly value: string
  }
  MarkerHeight: (value: string) => {
    readonly _tag: 'MarkerHeight'
    readonly value: string
  }
  MarkerUnits: (value: string) => {
    readonly _tag: 'MarkerUnits'
    readonly value: string
  }
  RefX: (value: string) => { readonly _tag: 'RefX'; readonly value: string }
  RefY: (value: string) => { readonly _tag: 'RefY'; readonly value: string }
  Orient: (value: string) => { readonly _tag: 'Orient'; readonly value: string }
  PreserveAspectRatio: (value: string) => {
    readonly _tag: 'PreserveAspectRatio'
    readonly value: string
  }
  /** Attaches one element-owned Mount. A second `OnMount` on the same element
   *  throws during VNode construction, before either Mount handler starts.
   *  Combine element-owned work in one scoped Mount. `OnUnmount` may share
   *  the element with that Mount. */
  OnMount: <
    Action extends MountAction<
      Message,
      unknown,
      never | AllowedMountRequirements
    >,
  >(
    action: Action,
  ) => {
    readonly _tag: 'OnMount'
    readonly action: Action
  }
  OnUnmount: (message: Message) => {
    readonly _tag: 'OnUnmount'
    readonly message: Message
  }
}

const htmlAttributes = <Message, AllowedMountRequirements>(): HtmlAttributes<
  Message,
  AllowedMountRequirements
> => {
  const constructors = Object.entries(attributeDefinitions).flatMap(
    ([tag, [create]]) => {
      if (create === undefined) {
        return []
      }

      // NOTE: the mapped definitions correlate a constructor with its own tag.
      // Object.entries erases that correlation, but both still come from one entry.
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const make = create as (
        tag: string,
      ) => (...args: ReadonlyArray<never>) => unknown
      const constructor = make(tag)
      Object.defineProperty(constructor, 'name', {
        value: tag,
        configurable: true,
      })
      return [[tag, constructor]]
    },
  )

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Object.fromEntries(constructors) as HtmlAttributes<
    Message,
    AllowedMountRequirements
  >
}

declare const messageUniverse: unique symbol
declare const allowedMountRequirements: unique symbol

/**
 * Phantom marker carrying the builder's Message universe invariantly, so a
 * builder from the wrong frame is rejected on this property rather than deep
 * inside the structural comparison of every element constructor. It exists only
 * to keep the diagnostic short and pointed at the cause.
 */
type MessageUniverse<Message> = Readonly<{
  [messageUniverse]: (message: Message) => Message
}>

/**
 * The exact Message union accepted by an Html builder. Derive feature-local
 * callback attribute types from its Composition builder without importing the
 * completed implementation or replacing generated delivery with local facts.
 *
 * @example
 * ```ts
 * type SearchMessage = MessageOf<SearchViewBuilder>
 * ```
 */
export type MessageOf<Builder> =
  Builder extends MessageUniverse<infer Message> ? Message : never

type MountRequirementsUniverse<AllowedMountRequirements> = Readonly<{
  [allowedMountRequirements]: (requirements: AllowedMountRequirements) => void
}>

type AnyBoundBlockConfig = Readonly<{
  [ViewScopeTypeId]: ViewScope &
    Readonly<{
      __blockConfigEvidence: Readonly<{
        config: object
        parentMessage: unknown
        mountRequirements: unknown
      }>
    }>
}>

type BoundConfigEvidenceOf<Config extends AnyBoundBlockConfig> =
  Config[typeof ViewScopeTypeId]['__blockConfigEvidence']['config']

type BoundParentMessageOf<Config extends AnyBoundBlockConfig> =
  Config[typeof ViewScopeTypeId]['__blockConfigEvidence']['parentMessage']

type BoundMountRequirementsOf<Config extends AnyBoundBlockConfig> =
  Config[typeof ViewScopeTypeId]['__blockConfigEvidence']['mountRequirements']

type IsAnyBoundParentMessage<Config extends AnyBoundBlockConfig> = 0 extends 1 &
  BoundParentMessageOf<Config>
  ? true
  : false

type CheckedBlockConfig<
  Config extends AnyBoundBlockConfig,
  ParentMessage,
  AllowedMountRequirements,
> = Config &
  (Config extends BoundConfigEvidenceOf<Config>
    ? unknown
    : Readonly<{
        'Block render config must preserve its bound view, Model, Message mapper, and viewInputs': never
      }>) &
  (IsAnyBoundParentMessage<Config> extends true
    ? Readonly<{
        'Block binding cannot erase the parent Message with any': never
      }>
    : [BoundParentMessageOf<Config>] extends [ParentMessage]
      ? unknown
      : Readonly<{
          'Block binding must use the parent Message': never
        }>) &
  ([
    Exclude<BoundMountRequirementsOf<Config>, AllowedMountRequirements>,
  ] extends [never]
    ? unknown
    : Readonly<{
        'Block view requires Mounts that are not registered by this application': never
      }>)

/**
 * The typed Html builder a view builds DOM with: all HTML, SVG, and MathML
 * element constructors, attribute constructors, a `keyed` helper for keyed
 * elements, `empty` for rendering nothing, and `block` for embedding a
 * child Block.
 *
 * A builder cannot be constructed by application code. The runtime supplies
 * it to each view alongside the model, typed by the Message universe of the
 * frame that view renders in: the app's Message for the root view, the
 * Block's own Message inside a view authored through its Composition's
 * `view` method. Used in the frame that supplied it, a handler built with it
 * carries exactly the Messages that frame's dispatcher can route, so a Message
 * from another universe (the classic case: a shared helper building an
 * app-level Message inside a Block) is a compile error at the handler call
 * site.
 *
 * The type scopes where a builder is obtained, not where it is used. Carrying
 * one into another frame, by storing it or handing the builder itself to a
 * child through `viewInputs`, still compiles and still builds handlers that
 * frame cannot route. Thread `h` as a parameter; never store it.
 *
 * Pass `h` along as an ordinary parameter when extracting view helpers; a
 * memoized helper receives it through the `createLazy` args array. When a
 * child must render markup that belongs to an ancestor, the ancestor passes a
 * renderer that already closed over its own builder, not the builder, so the
 * handlers resolve in the ancestor's boundary. Where no builder is in scope
 * at all, typically module scope, use {@link inertHtml}.
 */
export type HtmlBuilder<
  Message,
  AllowedMountRequirements = never,
> = MessageUniverse<Message> &
  MountRequirementsUniverse<AllowedMountRequirements> &
  HtmlElements<Message, AllowedMountRequirements> &
  HtmlAttributes<Message, AllowedMountRequirements> &
  Readonly<{
    empty: null
    keyed: KeyedFunction<Message, AllowedMountRequirements>
    block: <const Config extends AnyBoundBlockConfig>(
      config: CheckedBlockConfig<Config, Message, AllowedMountRequirements>,
    ) => Html
  }>

const buildHtmlFactory = <Message, AllowedMountRequirements>(): Omit<
  HtmlBuilder<Message, AllowedMountRequirements>,
  typeof messageUniverse | typeof allowedMountRequirements
> => ({
  ...htmlElements<Message, AllowedMountRequirements>(),
  ...htmlAttributes<Message, AllowedMountRequirements>(),
  empty: null,
  keyed: keyed<Message, AllowedMountRequirements>(),
  block: <const Config extends AnyBoundBlockConfig>(
    config: CheckedBlockConfig<Config, Message, AllowedMountRequirements>,
  ) =>
    block(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      config as unknown as BlockConfig<AnyBlockView, unknown>,
      cachedHtmlBuilder,
    ),
})

// NOTE: the Message type parameter is erased at runtime and the element and
// attribute constructors carry no per-program state (dispatch is read from
// the runtime singleton frame at call time), so one process-wide builder
// object serves every frame. Handing out the singleton under a frame's
// Message type changes the static type and nothing else, so the same object
// reaches every view. That keeps the builder referentially stable across
// renders, which `createLazy`'s `===` args comparison relies on when `h` is
// passed through a memoized helper's args array.
const cachedHtmlBuilder: HtmlBuilder<unknown, AnyMountHandler> =
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  buildHtmlFactory<unknown, AnyMountHandler>() as HtmlBuilder<
    unknown,
    AnyMountHandler
  >

/** @internal Allows isolated renderer fixtures to supply native boundary configurations. */
export type NativeHtmlBuilder<
  Message,
  AllowedMountRequirements = never,
> = HtmlBuilder<Message, AllowedMountRequirements> &
  Readonly<{
    block: <View extends AnyBlockView>(
      config: BlockConfig<View, Message> &
        ([
          Exclude<ViewMountRequirementsOf<View>, AllowedMountRequirements>,
        ] extends [never]
          ? unknown
          : Readonly<{
              'Block view requires Mounts that are not registered by this application': never
            }>),
    ) => Html
  }>

/** @internal Returns the process-wide builder singleton retyped to a frame's
 *  Message. Only the runtime, the Scene test harness, and the framework's own
 *  tests call this, each immediately before invoking a view under the frame
 *  that Message belongs to. `h.block` does not: it receives the singleton
 *  as a parameter, which is what keeps `index.ts` and `block.ts` free of a
 *  runtime import cycle. Application code receives builders exclusively as
 *  view parameters. */
export const __htmlBuilder = <
  Message,
  AllowedMountRequirements = never,
>(): NativeHtmlBuilder<Message, AllowedMountRequirements> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  cachedHtmlBuilder as unknown as NativeHtmlBuilder<
    Message,
    AllowedMountRequirements
  >

/**
 * Builder whose Message universe is empty. Its Message type is `never`, so
 * every event-handler constructor is uncallable and nothing built with it can
 * dispatch a Message. Elements, attributes, and keying behave exactly as they
 * do on any other builder, and the markup itself is free to vary with runtime
 * data. Inert describes what the result can do, not how it is computed.
 *
 * Inert to Foldkit's dispatch, not to the browser. A raw DOM attribute still
 * does whatever the browser makes of it, which is exactly how the default
 * crash view gets a working reload button:
 * `h.Attribute('onclick', 'location.reload()')`. What `never` rules out is a
 * Message reaching `update`, not every possible behavior.
 *
 * Use it where no builder is in scope, which in practice means module scope
 * and the frameless renders the framework performs itself:
 *
 * ```ts
 * import { inertHtml as ih } from 'foldkit/html'
 *
 * const PagefindBody = ih.DataAttribute('pagefind-body', '')
 * ```
 *
 * Attributes it produces are `Attribute<never>`, so they flow into any
 * Message universe by covariance. That makes it the right builder for
 * library code emitting handler-free attribute bundles for arbitrary apps.
 *
 * Inside a view, use the view's own `h` parameter. A view already holds a
 * builder, and reaching past it for this one is the habit that made a
 * caller-chosen Message type possible in the first place.
 */
export const inertHtml: HtmlBuilder<never> = __htmlBuilder<never>()
