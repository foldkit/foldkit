import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { taggedStruct } from 'foldkit/schema'

const Model = taggedStruct('EditingProfile', { displayName: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  UpdatedDisplayName: { value: Schema.String },
})
type Message = typeof Message.Type

export const EditorKey = Symbol('Editor')
export const EditorBlock = Block.make('Editor', {
  key: EditorKey,
  InitArgs: Schema.Tuple([Schema.String]),
  Model,
  Message,
})

const { makeFieldsStep, makeComposition } = EditorBlock

const EditorComposition = makeComposition()

export const layer = EditorBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init: EditorComposition.makeInit((displayName: string) => ({
        model: Model({ displayName }),
      })),
      update: EditorComposition.makeUpdate({
        UpdatedDisplayName: makeFieldsStep.fromMessage(({ value }) => ({
          displayName: () => value,
        })),
      }),
    }
  }),
)
