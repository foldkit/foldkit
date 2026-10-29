import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Saved: {},
  Failed: { reason: Schema.String },
})
type SaveState = typeof SaveState.Type

const Model = Schema.Struct({ contents: Schema.String, save: SaveState })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedSave: {},
  SucceededSaveDocument: {},
  FailedSaveDocument: { reason: Schema.String },
})
type Message = typeof Message.Type

const EditorDefinition = Block.makeDefinition('Editor', { Model, Message })

const { makeFieldsStep } = EditorDefinition

const EditorComposition = EditorDefinition.makeComposition()

const SaveDocument = EditorDefinition.makeCommand('SaveDocument', {
  args: { contents: Schema.String },
  messages: [Message.SucceededSaveDocument, Message.FailedSaveDocument],
})

const init = EditorComposition.makeInit((contents: string) => ({
  model: { contents, save: SaveState.Idle() },
}))

const update = EditorComposition.makeUpdate({
  ClickedSave: model => ({
    model: modifyFields(model, { save: () => SaveState.Saving() }),
    commands: [SaveDocument({ contents: model.contents })],
  }),
  SucceededSaveDocument: makeFieldsStep(() => ({
    save: () => SaveState.Saved(),
  })),
  FailedSaveDocument: makeFieldsStep.fromMessage(({ reason }) => ({
    save: () => SaveState.Failed({ reason }),
  })),
})

const prepare = () =>
  EditorComposition.prepareBlock({
    init,
    update,
    hostHandlers: [SaveDocument],
  })
export const EditorBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
