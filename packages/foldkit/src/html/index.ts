import {
  Array,
  Data,
  Effect,
  Match,
  Option,
  Predicate,
  Record,
  Ref,
  String,
  pipe,
} from 'effect'
import { h } from 'snabbdom'
import type { Attrs, On, Props, VNodeData } from 'snabbdom'

import { Dispatch } from '../runtime'
import { VNode } from '../vdom'

export { createKeyedLazy, createLazy } from './lazy'

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

/** A virtual DOM element represented as an `Effect` that produces a `VNode`. */
export type Html = Effect.Effect<VNode | null, never, Dispatch>
type Child = Html | string

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

/** Union of all HTML, SVG, and MathML attributes a virtual DOM element can carry. */
export type Attribute<Message> = Data.TaggedEnum<{
  Key: { readonly value: string }
  Class: { readonly value: string }
  Id: { readonly value: string }
  Title: { readonly value: string }
  Lang: { readonly value: string }
  Dir: { readonly value: string }
  Tabindex: { readonly value: number }
  Hidden: { readonly value: boolean }
  OnClick: { readonly message: Message }
  OnDblClick: { readonly message: Message }
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
  OnSubmit: { readonly message: Message }
  OnReset: { readonly message: Message }
  OnScroll: { readonly message: Message }
  OnWheel: { readonly message: Message }
  OnCopy: { readonly message: Message }
  OnCut: { readonly message: Message }
  OnPaste: { readonly message: Message }
  OnCancel: { readonly message: Message }
  OnToggle: { readonly f: (isOpen: boolean) => Message }
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
  OnInsert: { readonly f: (element: Element) => void }
  OnDestroy: { readonly f: (element: Element) => void }
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
  OnClick,
  OnDblClick,
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
  OnSubmit,
  OnReset,
  OnScroll,
  OnWheel,
  OnCopy,
  OnCut,
  OnPaste,
  OnCancel,
  OnToggle,
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
  OnInsert,
  OnDestroy,
} = Data.taggedEnum<AttributeDefinition>()

const buildVNodeData = <Message>(
  attributes: ReadonlyArray<Attribute<Message>>,
): Effect.Effect<VNodeData, never, Dispatch> =>
  Effect.gen(function* () {
    const { dispatchSync } = yield* Dispatch
    const dataRef = yield* Ref.make<VNodeData>({})

    const setData = <K extends keyof VNodeData>(key: K, value: VNodeData[K]) =>
      Ref.update(dataRef, data => ({ ...data, [key]: value }))

    const updateData = <K extends keyof VNodeData>(
      key: K,
      value: Partial<VNodeData[K]>,
    ) =>
      Ref.update(dataRef, data => ({
        ...data,
        [key]: { ...data[key], ...value },
      }))

    const updateDataProps = (props: Props) => updateData('props', props)
    const updateDataOn = (on: On) => updateData('on', on)
    const updateDataAttrs = (attrs: Attrs) => updateData('attrs', attrs)

    const postpatchPropsRef = yield* Ref.make<
      Array<Readonly<{ propName: string; value: unknown }>>
    >([])

    const updatePropsWithPostpatch = <K extends string>(
      propName: K,
      value: unknown,
    ) =>
      Effect.all([
        Ref.update(dataRef, data => ({
          ...data,
          props: {
            ...data.props,
            [propName]: value,
          },
        })),
        Ref.update(postpatchPropsRef, entries => [
          ...entries,
          { propName, value },
        ]),
      ])

    yield* Effect.forEach(attributes, attr =>
      Match.value(attr).pipe(
        Match.tagsExhaustive({
          Key: ({ value }) => setData('key', value),
          Class: ({ value }) =>
            Effect.gen(function* () {
              const classObject = pipe(
                value,
                String.split(/\s+/),
                Array.filter(String.isNonEmpty),
                Array.reduce({}, (acc, className) => ({
                  ...acc,
                  [className]: true,
                })),
              )
              yield* setData('class', classObject)
            }),
          Id: ({ value }) => updateDataProps({ id: value }),
          Title: ({ value }) => updateDataProps({ title: value }),
          Lang: ({ value }) => updateDataProps({ lang: value }),
          Dir: ({ value }) => updateDataProps({ dir: value }),
          Tabindex: ({ value }) => updateDataProps({ tabIndex: value }),
          Hidden: ({ value }) => updateDataProps({ hidden: value }),
          OnClick: ({ message }) =>
            updateDataOn({
              click: () => dispatchSync(message),
            }),
          OnDblClick: ({ message }) =>
            updateDataOn({
              dblclick: () => dispatchSync(message),
            }),
          OnMouseDown: ({ message }) =>
            updateDataOn({
              mousedown: () => dispatchSync(message),
            }),
          OnMouseUp: ({ message }) =>
            updateDataOn({
              mouseup: () => dispatchSync(message),
            }),
          OnMouseEnter: ({ message }) =>
            updateDataOn({
              mouseenter: () => dispatchSync(message),
            }),
          OnMouseLeave: ({ message }) =>
            updateDataOn({
              mouseleave: () => dispatchSync(message),
            }),
          OnMouseOver: ({ message }) =>
            updateDataOn({
              mouseover: () => dispatchSync(message),
            }),
          OnMouseOut: ({ message }) =>
            updateDataOn({
              mouseout: () => dispatchSync(message),
            }),
          OnMouseMove: ({ message }) =>
            updateDataOn({
              mousemove: () => dispatchSync(message),
            }),
          OnPointerMove: ({ f }) =>
            updateDataOn({
              pointermove: (event: PointerEvent) => {
                const maybeMessage = f(
                  event.screenX,
                  event.screenY,
                  event.pointerType,
                )
                if (Option.isSome(maybeMessage)) {
                  dispatchSync(maybeMessage.value)
                }
              },
            }),
          OnPointerLeave: ({ f }) =>
            updateDataOn({
              pointerleave: (event: PointerEvent) => {
                const maybeMessage = f(event.pointerType)
                if (Option.isSome(maybeMessage)) {
                  dispatchSync(maybeMessage.value)
                }
              },
            }),
          OnPointerDown: ({ f }) =>
            updateDataOn({
              pointerdown: (event: PointerEvent) => {
                const maybeMessage = f(
                  event.pointerType,
                  event.button,
                  event.screenX,
                  event.screenY,
                  event.timeStamp,
                )
                if (Option.isSome(maybeMessage)) {
                  dispatchSync(maybeMessage.value)
                }
              },
            }),
          OnPointerUp: ({ f }) =>
            updateDataOn({
              pointerup: (event: PointerEvent) => {
                const maybeMessage = f(
                  event.screenX,
                  event.screenY,
                  event.pointerType,
                  event.timeStamp,
                )
                if (Option.isSome(maybeMessage)) {
                  dispatchSync(maybeMessage.value)
                }
              },
            }),
          OnKeyDown: ({ f }) =>
            updateDataOn({
              keydown: (event: KeyboardEvent) =>
                dispatchSync(f(event.key, keyboardModifiers(event))),
            }),
          OnKeyDownPreventDefault: ({ f }) =>
            updateDataOn({
              keydown: (event: KeyboardEvent) => {
                const maybeMessage = f(event.key, keyboardModifiers(event))
                if (Option.isSome(maybeMessage)) {
                  event.preventDefault()
                  dispatchSync(maybeMessage.value)
                }
              },
            }),
          OnKeyUp: ({ f }) =>
            updateDataOn({
              keyup: (event: KeyboardEvent) =>
                dispatchSync(f(event.key, keyboardModifiers(event))),
            }),
          OnKeyUpPreventDefault: ({ f }) =>
            updateDataOn({
              keyup: (event: KeyboardEvent) => {
                const maybeMessage = f(event.key, keyboardModifiers(event))
                if (Option.isSome(maybeMessage)) {
                  event.preventDefault()
                  dispatchSync(maybeMessage.value)
                }
              },
            }),
          OnKeyPress: ({ f }) =>
            updateDataOn({
              keypress: (event: KeyboardEvent) =>
                dispatchSync(f(event.key, keyboardModifiers(event))),
            }),
          OnFocus: ({ message }) =>
            updateDataOn({
              focus: () => dispatchSync(message),
            }),
          OnBlur: ({ message }) =>
            updateDataOn({
              blur: () => dispatchSync(message),
            }),
          OnInput: ({ f }) =>
            updateDataOn({
              input: (event: Event) =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                dispatchSync(f((event.target as HTMLInputElement).value)),
            }),
          OnChange: ({ f }) =>
            updateDataOn({
              change: (event: Event) =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                dispatchSync(f((event.target as HTMLInputElement).value)),
            }),
          OnSubmit: ({ message }) =>
            updateDataOn({
              submit: (event: Event) => {
                event.preventDefault()
                dispatchSync(message)
              },
            }),
          OnReset: ({ message }) =>
            updateDataOn({
              reset: () => dispatchSync(message),
            }),
          OnScroll: ({ message }) =>
            updateDataOn({
              scroll: () => dispatchSync(message),
            }),
          OnWheel: ({ message }) =>
            updateDataOn({
              wheel: () => dispatchSync(message),
            }),
          OnCopy: ({ message }) =>
            updateDataOn({
              copy: () => dispatchSync(message),
            }),
          OnCut: ({ message }) =>
            updateDataOn({
              cut: () => dispatchSync(message),
            }),
          OnPaste: ({ message }) =>
            updateDataOn({
              paste: () => dispatchSync(message),
            }),
          OnCancel: ({ message }) =>
            updateDataOn({
              cancel: (event: Event) => {
                event.preventDefault()
                dispatchSync(message)
              },
            }),
          OnToggle: ({ f }) =>
            updateDataOn({
              toggle: event =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                dispatchSync(f((event.target as HTMLDetailsElement).open)),
            }),
          Value: ({ value }) => updatePropsWithPostpatch('value', value),
          Checked: ({ value }) => updatePropsWithPostpatch('checked', value),
          Selected: ({ value }) => updatePropsWithPostpatch('selected', value),
          Open: ({ value }) => updatePropsWithPostpatch('open', value),
          Placeholder: ({ value }) => updateDataProps({ placeholder: value }),
          Name: ({ value }) => updateDataProps({ name: value }),
          Disabled: ({ value }) => updateDataProps({ disabled: value }),
          Readonly: ({ value }) => updateDataProps({ readOnly: value }),
          Required: ({ value }) => updateDataProps({ required: value }),
          Autofocus: ({ value }) => updateDataProps({ autofocus: value }),
          Spellcheck: ({ value }) =>
            updateDataAttrs({ spellcheck: value.toString() }),
          Autocorrect: ({ value }) => updateDataAttrs({ autocorrect: value }),
          Autocapitalize: ({ value }) =>
            updateDataAttrs({ autocapitalize: value }),
          InputMode: ({ value }) => updateDataAttrs({ inputmode: value }),
          EnterKeyHint: ({ value }) => updateDataAttrs({ enterkeyhint: value }),
          Multiple: ({ value }) => updateDataProps({ multiple: value }),
          Type: ({ value }) => updateDataProps({ type: value }),
          Accept: ({ value }) => updateDataProps({ accept: value }),
          Autocomplete: ({ value }) => updateDataProps({ autocomplete: value }),
          Pattern: ({ value }) => updateDataProps({ pattern: value }),
          Maxlength: ({ value }) => updateDataProps({ maxLength: value }),
          Minlength: ({ value }) => updateDataProps({ minLength: value }),
          Size: ({ value }) => updateDataProps({ size: value }),
          Cols: ({ value }) => updateDataProps({ cols: value }),
          Rows: ({ value }) => updateDataProps({ rows: value }),
          Max: ({ value }) => updateDataProps({ max: value }),
          Min: ({ value }) => updateDataProps({ min: value }),
          Step: ({ value }) => updateDataProps({ step: value }),
          For: ({ value }) => updateDataProps({ for: value }),
          Href: ({ value }) => updateDataProps({ href: value }),
          Src: ({ value }) => updateDataProps({ src: value }),
          Alt: ({ value }) => updateDataProps({ alt: value }),
          Target: ({ value }) => updateDataProps({ target: value }),
          Rel: ({ value }) => updateDataProps({ rel: value }),
          Download: ({ value }) => updateDataProps({ download: value }),
          Action: ({ value }) => updateDataProps({ action: value }),
          Method: ({ value }) => updateDataProps({ method: value }),
          Enctype: ({ value }) => updateDataProps({ enctype: value }),
          Novalidate: ({ value }) => updateDataProps({ noValidate: value }),
          Role: ({ value }) => updateDataAttrs({ role: value }),
          AriaLabel: ({ value }) => updateDataAttrs({ 'aria-label': value }),
          AriaLabelledBy: ({ value }) =>
            updateDataAttrs({ 'aria-labelledby': value }),
          AriaDescribedBy: ({ value }) =>
            updateDataAttrs({ 'aria-describedby': value }),
          AriaHidden: ({ value }) =>
            updateDataAttrs({ 'aria-hidden': value.toString() }),
          AriaExpanded: ({ value }) =>
            updateDataAttrs({ 'aria-expanded': value.toString() }),
          AriaSelected: ({ value }) =>
            updateDataAttrs({ 'aria-selected': value.toString() }),
          AriaChecked: ({ value }) =>
            updateDataAttrs({ 'aria-checked': value.toString() }),
          AriaDisabled: ({ value }) =>
            updateDataAttrs({ 'aria-disabled': value.toString() }),
          AriaRequired: ({ value }) =>
            updateDataAttrs({ 'aria-required': value.toString() }),
          AriaInvalid: ({ value }) =>
            updateDataAttrs({ 'aria-invalid': value.toString() }),
          AriaLive: ({ value }) => updateDataAttrs({ 'aria-live': value }),
          AriaControls: ({ value }) =>
            updateDataAttrs({ 'aria-controls': value }),
          AriaCurrent: ({ value }) =>
            updateDataAttrs({ 'aria-current': value }),
          AriaOrientation: ({ value }) =>
            updateDataAttrs({ 'aria-orientation': value }),
          AriaPressed: ({ value }) =>
            updateDataAttrs({ 'aria-pressed': value }),
          AriaHasPopup: ({ value }) =>
            updateDataAttrs({ 'aria-haspopup': value }),
          AriaActiveDescendant: ({ value }) =>
            updateDataAttrs({ 'aria-activedescendant': value }),
          AriaSort: ({ value }) => updateDataAttrs({ 'aria-sort': value }),
          AriaMultiSelectable: ({ value }) =>
            updateDataAttrs({ 'aria-multiselectable': value.toString() }),
          AriaModal: ({ value }) =>
            updateDataAttrs({ 'aria-modal': value.toString() }),
          AriaBusy: ({ value }) =>
            updateDataAttrs({ 'aria-busy': value.toString() }),
          AriaErrorMessage: ({ value }) =>
            updateDataAttrs({ 'aria-errormessage': value }),
          AriaRoleDescription: ({ value }) =>
            updateDataAttrs({ 'aria-roledescription': value }),
          Attribute: ({ key, value }) => updateDataAttrs({ [key]: value }),
          DataAttribute: ({ key, value }) =>
            updateDataAttrs({ [`data-${key}`]: value }),
          Style: ({ value }) => setData('style', value),
          InnerHTML: ({ value }) => updateDataProps({ innerHTML: value }),
          ViewBox: ({ value }) => updateDataAttrs({ viewBox: value }),
          Xmlns: ({ value }) => updateDataAttrs({ xmlns: value }),
          Fill: ({ value }) => updateDataAttrs({ fill: value }),
          FillRule: ({ value }) => updateDataAttrs({ 'fill-rule': value }),
          ClipRule: ({ value }) => updateDataAttrs({ 'clip-rule': value }),
          Stroke: ({ value }) => updateDataAttrs({ stroke: value }),
          StrokeWidth: ({ value }) =>
            updateDataAttrs({ 'stroke-width': value }),
          StrokeLinecap: ({ value }) =>
            updateDataAttrs({ 'stroke-linecap': value }),
          StrokeLinejoin: ({ value }) =>
            updateDataAttrs({ 'stroke-linejoin': value }),
          D: ({ value }) => updateDataAttrs({ d: value }),
          Cx: ({ value }) => updateDataAttrs({ cx: value }),
          Cy: ({ value }) => updateDataAttrs({ cy: value }),
          R: ({ value }) => updateDataAttrs({ r: value }),
          X: ({ value }) => updateDataAttrs({ x: value }),
          Y: ({ value }) => updateDataAttrs({ y: value }),
          Width: ({ value }) => updateDataAttrs({ width: value }),
          Height: ({ value }) => updateDataAttrs({ height: value }),
          X1: ({ value }) => updateDataAttrs({ x1: value }),
          Y1: ({ value }) => updateDataAttrs({ y1: value }),
          X2: ({ value }) => updateDataAttrs({ x2: value }),
          Y2: ({ value }) => updateDataAttrs({ y2: value }),
          Points: ({ value }) => updateDataAttrs({ points: value }),
          Transform: ({ value }) => updateDataAttrs({ transform: value }),
          Opacity: ({ value }) => updateDataAttrs({ opacity: value }),
          StrokeDasharray: ({ value }) =>
            updateDataAttrs({ 'stroke-dasharray': value }),
          StrokeDashoffset: ({ value }) =>
            updateDataAttrs({ 'stroke-dashoffset': value }),
          OnInsert: ({ f }) =>
            Ref.update(dataRef, data => ({
              ...data,
              hook: {
                ...data.hook,
                insert: vnode => {
                  if (vnode.elm instanceof Element) {
                    f(vnode.elm)
                  }
                },
              },
            })),
          OnDestroy: ({ f }) =>
            Ref.update(dataRef, data => ({
              ...data,
              hook: {
                ...data.hook,
                destroy: vnode => {
                  if (vnode.elm instanceof Element) {
                    f(vnode.elm)
                  }
                },
              },
            })),
        }),
      ),
    )

    const postpatchProps = yield* Ref.get(postpatchPropsRef)

    if (Array.isNonEmptyArray(postpatchProps)) {
      yield* Ref.update(dataRef, data => ({
        ...data,
        hook: {
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
        },
      }))
    }

    return yield* Ref.get(dataRef)
  })

const processVNodeChildren = (
  children: ReadonlyArray<Child>,
): Effect.Effect<ReadonlyArray<VNode | string>, never, Dispatch> =>
  Effect.forEach(
    children,
    (child): Effect.Effect<VNode | string | null, never, Dispatch> =>
      Predicate.isString(child) ? Effect.succeed(child) : child,
  ).pipe(Effect.map(Array.filter(Predicate.isNotNull)))

const createElement = <Message>(
  tagName: TagName,
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html =>
  Effect.gen(function* () {
    const vnodeData = yield* buildVNodeData(attributes)
    const vnodeChildren = yield* processVNodeChildren(children)

    return h(tagName, vnodeData, Array.fromIterable(vnodeChildren))
  })

const element =
  <Message>() =>
  (tagName: TagName) =>
  (
    attributes: ReadonlyArray<Attribute<Message>> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

const voidElement =
  <Message>() =>
  (tagName: TagName) =>
  (attributes: ReadonlyArray<Attribute<Message>> = []): Html =>
    createElement(tagName, attributes, [])

const keyed =
  <Message>() =>
  (tagName: TagName) =>
  (
    key: string,
    attributes: ReadonlyArray<Attribute<Message>> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    element<Message>()(tagName)([...attributes, Key({ value: key })], children)

type ElementFunction<Message> = (
  attributes: ReadonlyArray<Attribute<Message>>,
  children: ReadonlyArray<Child>,
) => Html

type VoidElementFunction<Message> = (
  attributes: ReadonlyArray<Attribute<Message>>,
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
  OnClick: (message: Message) => {
    readonly _tag: 'OnClick'
    readonly message: Message
  }
  OnDblClick: (message: Message) => {
    readonly _tag: 'OnDblClick'
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
    ) => Option.Option<Message>,
  ) => {
    readonly _tag: 'OnPointerDown'
    readonly f: (
      pointerType: string,
      button: number,
      screenX: number,
      screenY: number,
      timeStamp: number,
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
  OnSubmit: (message: Message) => {
    readonly _tag: 'OnSubmit'
    readonly message: Message
  }
  OnReset: (message: Message) => {
    readonly _tag: 'OnReset'
    readonly message: Message
  }
  OnScroll: (message: Message) => {
    readonly _tag: 'OnScroll'
    readonly message: Message
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
  OnInsert: (f: (element: Element) => void) => {
    readonly _tag: 'OnInsert'
    readonly f: (element: Element) => void
  }
  OnDestroy: (f: (element: Element) => void) => {
    readonly _tag: 'OnDestroy'
    readonly f: (element: Element) => void
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
  OnClick: (message: Message) => OnClick({ message }),
  OnDblClick: (message: Message) => OnDblClick({ message }),
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
  OnSubmit: (message: Message) => OnSubmit({ message }),
  OnReset: (message: Message) => OnReset({ message }),
  OnScroll: (message: Message) => OnScroll({ message }),
  OnWheel: (message: Message) => OnWheel({ message }),
  OnCopy: (message: Message) => OnCopy({ message }),
  OnCut: (message: Message) => OnCut({ message }),
  OnPaste: (message: Message) => OnPaste({ message }),
  OnCancel: (message: Message) => OnCancel({ message }),
  OnToggle: (f: (isOpen: boolean) => Message) => OnToggle({ f }),
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
  OnInsert: (f: (element: Element) => void) => OnInsert({ f }),
  OnDestroy: (f: (element: Element) => void) => OnDestroy({ f }),
})

/**
 * Factory that returns all HTML, SVG, and MathML element constructors,
 * attribute constructors, a `keyed` helper for keyed elements, and `empty`
 * for rendering nothing.
 */
export const html = <Message = never>() => {
  return {
    ...htmlElements<Message>(),
    ...htmlAttributes<Message>(),
    empty: Effect.succeed(null),
    keyed: keyed<Message>(),
  }
}
