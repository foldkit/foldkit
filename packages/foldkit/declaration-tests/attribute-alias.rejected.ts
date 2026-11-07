import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import type { Attribute, ChildAttribute, HtmlBuilder } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'

import {
  Message,
  Observe,
  type ObserveRequirements,
  ParentBlock,
  Widget,
} from './attribute-alias.accepted.js'

const ForeignMessage = defineMessageUnion({ ClickedForeign: {} })

export const rejectDiscriminatorWithoutNarrowing = (
  attribute: Attribute<Message>,
) => {
  // @ts-expect-error A published ChildAttribute has no local discriminator.
  return attribute._tag
}

export const rejectDoubleWrap = (attributes: ReadonlyArray<ChildAttribute>) => {
  // @ts-expect-error Publishing attributes requires raw tagged entries.
  return childAttributes(attributes)
}

export const rejectForeignMessage = (h: HtmlBuilder<Message>) =>
  h.button([
    // @ts-expect-error The event belongs to another Message contract.
    h.OnClick(ForeignMessage.ClickedForeign()),
  ])

export const rejectTextareaContent = (h: HtmlBuilder<Message>) => {
  h.textarea([
    // @ts-expect-error Textarea content is controlled through Value.
    h.InnerHTML('draft'),
  ])
  h.keyed('textarea')('draft', [
    // @ts-expect-error Keyed textarea preserves the same content restriction.
    h.InnerHTML('draft'),
  ])
}

export const rejectUnregisteredMount = (h: HtmlBuilder<Message>) => {
  const widget = Widget.withMessage(h)

  h.div([
    // @ts-expect-error This builder has not registered Observe.
    h.OnMount(Observe()),
  ])
  widget([
    // @ts-expect-error CustomElement preserves its builder's Mount contract.
    { _tag: 'OnMount', action: Observe() },
  ])
}

export const rejectUnregisteredChildMount = (
  h: HtmlBuilder<Message>,
  attributes: ReadonlyArray<ChildAttribute<ObserveRequirements>>,
) => {
  const widget = Widget.withMessage(h)

  // @ts-expect-error The child Mount requires its original registration.
  h.div(attributes)
  // @ts-expect-error CustomElement cannot erase a child's Mount requirement.
  widget(attributes)
}

const UnregisteredComposition = ParentBlock.makeComposition()
export const rejectOmittedBinding = UnregisteredComposition.makeView.withInputs<
  Readonly<{ attributes: ReadonlyArray<ChildAttribute<ObserveRequirements>> }>
>((_model, { attributes }, h) => {
  // @ts-expect-error The child Binding carrying Observe is absent.
  return h.div(attributes)
})

const ObserveOther = Mount.define('ObserveOtherAttributeAlias', {
  messages: [Message.CompletedObserve],
})
const OtherKey = Symbol('AttributeAliasOther')
const OtherBlock = Block.make('AttributeAliasOther', {
  key: OtherKey,
  Model: Schema.Struct({}),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', mounts: [ObserveOther] },
})
const OtherBinding = ParentBlock.makeRequiredFieldBinding(OtherBlock, {
  field: 'origin',
})
const OtherComposition = ParentBlock.makeComposition({
  bindings: [OtherBinding],
})
export const rejectDifferentChildRegistration =
  OtherComposition.makeView.withInputs<
    Readonly<{ attributes: ReadonlyArray<ChildAttribute<ObserveRequirements>> }>
  >((_model, { attributes }, h) => {
    const widget = Widget.withMessage(h)

    // @ts-expect-error This registered child publishes a different Mount.
    widget(attributes)
    // @ts-expect-error Ordinary elements retain the same exact child capability.
    return h.div(attributes)
  })
