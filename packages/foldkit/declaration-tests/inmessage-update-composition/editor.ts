import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const EditorKey = Symbol('InputEditor')
const Model = Schema.Struct({ text: Schema.String })
const Message = defineMessageUnion({ UpdatedText: { text: Schema.String } })
const InMessage = defineMessageUnion({
  InformedOfTextChange: { text: Schema.String },
})
const OutMessage = defineMessageUnion({ Edited: {} })
const EditorDefinition = Block.makeDefinition('InputEditor', {
  key: EditorKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([]),
  inMessageOutputs: { InformedOfTextChange: { outMessage: OutMessage.Edited } },
})
const EditorComposition = EditorDefinition.makeComposition()
export const EditorBlock = EditorDefinition.contract
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
    inMessageUpdate: EditorComposition.makeInMessageUpdate({
      InformedOfTextChange: (model, { text }) => ({
        model: modifyFields(model, { text: () => text }),
        outMessage: OutMessage.Edited(),
      }),
    }),
  }),
).layer
