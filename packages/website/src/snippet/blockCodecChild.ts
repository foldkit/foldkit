import { Effect, Schema, SchemaTransformation } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const TrimmedLabel = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value => Effect.succeed(value.trim()),
      encode: Effect.succeed,
    }),
  ),
)
const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({ SubmittedLabel: { label: TrimmedLabel } })
type Message = typeof Message.Type
export const LabelEditorKey = Symbol('LabelEditor')
export const LabelEditorBlock = Block.make('LabelEditor', {
  key: LabelEditorKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeComposition } = LabelEditorBlock
const LabelEditorComposition = makeComposition()

export const layer = LabelEditorBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: LabelEditorComposition.makeInit(() => ({
      model: Model.make({ label: '' }),
    })),
    update: LabelEditorComposition.makeUpdate({
      SubmittedLabel: (model, { label }) => ({
        model: modifyFields(model, { label: () => label }),
      }),
    }),
    view: LabelEditorComposition.makeView((model, h) =>
      h.div([], [model.label]),
    ),
  }),
)
