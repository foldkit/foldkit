import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ text: Schema.String })
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedText: { text: Schema.String },
})
export type Message = typeof Message.Type

const InMessage = defineMessageUnion({
  InformedOfTextChange: { text: Schema.String },
})

const OutMessage = defineMessageUnion({ Edited: {} })

export const EditorKey = Symbol('Editor')
const EditorDefinition = Block.makeDefinition('Editor', {
  key: EditorKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
  InMessage,
  OutMessage,
})
const EditorComposition = EditorDefinition.makeComposition()

export const EditorBlock = EditorDefinition.contract
export const text = (model: Model): string => model.text
export const layer = EditorDefinition.makeBlock(
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
    receive: EditorComposition.makeReceive({
      InformedOfTextChange: (model, { text }) => ({
        model: modifyFields(model, { text: () => text }),
      }),
    }),
  }),
).layer
