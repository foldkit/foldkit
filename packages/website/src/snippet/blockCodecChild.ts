import { Context, Effect, Schema, SchemaTransformation } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class MessageMigration extends Context.Service<
  MessageMigration,
  Readonly<{
    decodeLabel: (label: string) => string
    encodeLabel: (label: string) => string
  }>
>()('MessageMigration') {}

const MigratedLabel = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.map(MessageMigration, service => service.decodeLabel(value)),
      encode: value =>
        Effect.map(MessageMigration, service => service.encodeLabel(value)),
    }),
  ),
)
type MigratedLabel = typeof MigratedLabel.Type
const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({ SubmittedLabel: { label: MigratedLabel } })
type Message = typeof Message.Type
export const LegacyEditorKey = Symbol('LegacyEditor')
export const LegacyEditorBlock = Block.make('LegacyEditor', {
  key: LegacyEditorKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeComposition } = LegacyEditorBlock
const LegacyEditorComposition = makeComposition()

export const layer = LegacyEditorBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: LegacyEditorComposition.makeInit(() => ({
      model: Model.make({ label: '' }),
    })),
    update: LegacyEditorComposition.makeUpdate({
      SubmittedLabel: (model, { label }) => ({
        model: modifyFields(model, { label: () => label }),
      }),
    }),
    view: LegacyEditorComposition.makeView((model, h) =>
      h.div([], [model.label]),
    ),
  }),
)
