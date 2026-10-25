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

const Model = Schema.Struct({ contents: Schema.String, save: SaveState })

const Message = defineMessageUnion({
  ClickedSave: {},
  SucceededSaveDocument: {},
  FailedSaveDocument: { reason: Schema.String },
})

const EditorDefinition = Block.makeDefinition('Editor', { Model, Message })
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
  SucceededSaveDocument: EditorDefinition.makeFieldsStep(() => ({
    save: () => SaveState.Saved(),
  })),
  FailedSaveDocument: EditorDefinition.makeFieldsStep.fromMessage(
    ({ reason }) => ({ save: () => SaveState.Failed({ reason }) }),
  ),
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
