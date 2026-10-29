import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { taggedStruct } from 'foldkit/schema'

const Model = taggedStruct('EditingProfile', { displayName: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  UpdatedDisplayName: { value: Schema.String },
})
type Message = typeof Message.Type

const EditorDefinition = Block.makeDefinition('Editor', { Model, Message })

const { makeFieldsStep } = EditorDefinition

const EditorComposition = EditorDefinition.makeComposition()
const prepare = () =>
  EditorComposition.prepareBlock({
    init: EditorComposition.makeInit((displayName: string) => ({
      model: Model({ displayName }),
    })),
    update: EditorComposition.makeUpdate({
      UpdatedDisplayName: makeFieldsStep.fromMessage(({ value }) => ({
        displayName: () => value,
      })),
    }),
  })
export const EditorBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
