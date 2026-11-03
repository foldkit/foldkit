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

const EditorKey = Symbol('Editor')

const EditorDefinition = Block.makeDefinition('Editor', {
  key: EditorKey,
  Init: Schema.Tuple([Schema.String]),
  Model,
  Message,
})

const { makeFieldsStep } = EditorDefinition

const EditorComposition = EditorDefinition.makeComposition()
export const EditorBlock = EditorDefinition.contract

export const layer = EditorDefinition.makeBlock(
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
).layer
