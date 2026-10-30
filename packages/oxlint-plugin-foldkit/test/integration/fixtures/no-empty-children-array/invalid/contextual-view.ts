import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ Rendered: {} })

export class ContextualView extends Block<ContextualView>()('ContextualView', {
  Model: Schema.Struct({}),
  Message,
}) {}

export const ContextualViewLive = ContextualView.make(
  Effect.fn(function* () {
    return {
      model: {},
      update: { Rendered: model => ({ model }) },
      view: (_model, h) => h.div([], []),
    }
  }),
)

type LabelInput = Readonly<{ label: string }>

export class LabelledView extends Block<LabelledView, void, LabelInput>()(
  'LabelledView',
  {},
) {}

export const LabelledViewLive = LabelledView.make(
  Effect.fn(function* () {
    return {
      view: (_model, h, { label }) => h.span([h.Title(label)], []),
    }
  }),
)
