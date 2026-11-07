import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ text: Schema.String })
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedText: { text: Schema.String },
})
export type Message = typeof Message.Type

const InMessage = defineInMessageUnion({
  InformedOfTextChange: { text: Schema.String },
})

const OutMessage = defineMessageUnion({ Edited: {} })

export const EditorKey = Symbol('Editor')
export const EditorBlock = Block.make('Editor', {
  key: EditorKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  InMessage,
  OutMessage,
})
const EditorComposition = EditorBlock.makeComposition()

export const { makeOutMessageStep } = EditorBlock
export const text = (model: Model): string => model.text
export const layer = EditorBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: EditorComposition.makeInit(() => ({
      model: Model.make({ text: '' }),
    })),
    update: EditorComposition.makeUpdate({
      UpdatedText: (model, { text }) => ({
        model: modifyFields(model, { text: () => text }),
        outMessage: OutMessage.Edited(),
      }),
    }),
    inMessageUpdate: EditorComposition.makeInMessageUpdate({
      InformedOfTextChange: (model, { text }) => ({
        model: modifyFields(model, { text: () => text }),
      }),
    }),
  }),
)
