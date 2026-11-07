import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as CustomElement from 'foldkit/customElement'
import {
  type Attribute,
  type ChildAttribute,
  type HtmlBuilder,
  type TaggedAttribute,
  type TextareaAttribute,
  childAttributes,
  inertHtml,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const Message = defineMessageUnion({
  ClickedControl: {},
  UpdatedValue: { value: Schema.String },
  CompletedObserve: {},
})
export type Message = typeof Message.Type

export const Observe = Mount.define('ObserveAttributeAlias', {
  messages: [Message.CompletedObserve],
})
export type ObserveRequirements = Mount.RequirementsOf<typeof Observe>

export const Widget = CustomElement.define({
  tag: 'attribute-alias-widget',
  properties: { label: Schema.String },
  events: { selected: Schema.Struct({ value: Schema.String }) },
})

export const staticAttributes: ReadonlyArray<Attribute<never>> = [
  inertHtml.Class('shared'),
]
export const textareaAttributes: ReadonlyArray<TextareaAttribute<never>> = [
  inertHtml.Class('shared-textarea'),
]

export const rawAttributes: ReadonlyArray<TaggedAttribute<Message>> = [
  inertHtml.Class('published'),
]

export const publishedRawAttributes = () => childAttributes(rawAttributes)

export const publishedAttributes = (
  h: HtmlBuilder<Message>,
): ReadonlyArray<Attribute<Message>> =>
  childAttributes([h.OnClick(Message.ClickedControl())])

export const acceptWrapped = (
  attributes: ReadonlyArray<ChildAttribute>,
): ReadonlyArray<Attribute<Message>> => attributes

export const attributeElements = (h: HtmlBuilder<Message>) => {
  const widget = Widget.withMessage(h)

  return h.div(staticAttributes, [
    h.input(staticAttributes),
    h.keyed('input')('field', staticAttributes),
    h.textarea(textareaAttributes),
    h.keyed('textarea')('draft', textareaAttributes),
    h.button([...staticAttributes, h.OnClick(Message.ClickedControl())]),
    widget([
      ...staticAttributes,
      widget.Label('Select'),
      widget.OnSelected(({ value }) => Message.UpdatedValue({ value })),
    ]),
    h.button(publishedAttributes(h)),
  ])
}

export const mountedAttributes = (
  h: HtmlBuilder<Message, ObserveRequirements>,
) => childAttributes([h.OnMount(Observe())])

export const mountedElements = (
  h: HtmlBuilder<Message, ObserveRequirements>,
) => {
  const widget = Widget.withMessage(h)
  const attributes: ReadonlyArray<Attribute<Message, ObserveRequirements>> =
    mountedAttributes(h)

  return h.div(attributes, [h.input(attributes), widget(attributes)])
}

export const OriginKey = Symbol('AttributeAliasOrigin')
export const OriginBlock = Block.make('AttributeAliasOrigin', {
  key: OriginKey,
  Model: Schema.Struct({}),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', mounts: [Observe] },
})
export type ParentViewInputs = Readonly<{
  attributes: ReadonlyArray<ChildAttribute<ObserveRequirements>>
}>

export const ParentKey = Symbol('AttributeAliasParent')
export const ParentBlock = Block.make('AttributeAliasParent', {
  key: ParentKey,
  Model: Schema.Struct({ origin: OriginBlock.Model }),
  Message,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ParentViewInputs>(),
  },
})
export const OriginBinding = ParentBlock.makeRequiredFieldBinding(OriginBlock, {
  field: 'origin',
})
export const ParentComposition = ParentBlock.makeComposition({
  bindings: [OriginBinding],
})
export const bindingMountView =
  ParentComposition.makeView.withInputs<ParentViewInputs>(
    (_model, { attributes }, h) => {
      const widget = Widget.withMessage(h)

      return h.div(attributes, [widget(attributes)])
    },
  )

export type ClassTag = Expect<
  Equal<ReturnType<HtmlBuilder<Message>['Class']>['_tag'], 'Class'>
>
export type ClickPayload = Expect<
  Equal<ReturnType<HtmlBuilder<Message>['OnClick']>['message'], Message>
>
