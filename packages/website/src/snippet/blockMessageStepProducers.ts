import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ issueId: Schema.String, title: Schema.String })
const Message = defineMessageUnion({
  UpdatedTitle: { title: Schema.String },
  RequestedSaveTitle: { title: Schema.String },
  ClickedClose: { reason: Schema.String },
  CompletedSaveTitle: {},
})
const OutMessage = defineMessageUnion({ Closed: { reason: Schema.String } })
const EditorDefinition = Block.makeDefinition('Editor', {
  Model,
  Message,
  OutMessage,
})
const EditorComposition = EditorDefinition.makeComposition()
const SaveTitle = EditorDefinition.makeCommand('SaveTitle', {
  args: { issueId: Schema.String, title: Schema.String },
  messages: [Message.CompletedSaveTitle],
})

export const update = EditorComposition.makeUpdate({
  UpdatedTitle: EditorDefinition.makeFieldsStep.fromMessage(({ title }) => ({
    title: () => title,
  })),
  RequestedSaveTitle: EditorDefinition.makeCommandsStep((model, { title }) => [
    SaveTitle({ issueId: model.issueId, title }),
  ]),
  ClickedClose: EditorDefinition.makeOutMessageStep.fromMessage(({ reason }) =>
    OutMessage.Closed({ reason }),
  ),
  CompletedSaveTitle: EditorDefinition.makeNoopStep(),
})
