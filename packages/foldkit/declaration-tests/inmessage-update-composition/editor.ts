import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const EditorKey = Symbol('InputEditor')
const Model = Schema.Struct({ text: Schema.String })
const Message = defineMessageUnion({ UpdatedText: { text: Schema.String } })
const InMessage = defineInMessageUnion({
  InformedOfTextChange: { text: Schema.String },
})
const OutMessage = defineMessageUnion({ Edited: {} })
export const EditorBlock = Block.make('InputEditor', {
  key: EditorKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: { InformedOfTextChange: { outMessage: OutMessage.Edited } },
})
const EditorComposition = EditorBlock.makeComposition()
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
        outMessage: OutMessage.Edited(),
      }),
    }),
  }),
)
