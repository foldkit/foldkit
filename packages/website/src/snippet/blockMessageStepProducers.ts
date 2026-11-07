import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ issueId: Schema.String, title: Schema.String })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedTitle: { title: Schema.String },
  RequestedSaveTitle: { title: Schema.String },
  SubmittedTitle: { title: Schema.String },
  ClickedClose: { reason: Schema.String },
  CompletedSaveTitle: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({ Closed: { reason: Schema.String } })
type OutMessage = typeof OutMessage.Type

export const EditorKey = Symbol('Editor')
const EditorBlock = Block.make('Editor', {
  key: EditorKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  OutMessage,
})

const {
  makeStep,
  makeFieldsStep,
  makeCommandsStep,
  makeOutMessageStep,
  makeNoopStep,
  makeComposition,
  makeCommand,
} = EditorBlock

const EditorComposition = makeComposition()
const SaveTitle = makeCommand('SaveTitle', {
  args: { issueId: Schema.String, title: Schema.String },
  messages: [Message.CompletedSaveTitle],
})

export const update = EditorComposition.makeUpdate({
  UpdatedTitle: makeFieldsStep.fromMessage(({ title }) => ({
    title: () => title,
  })),
  RequestedSaveTitle: makeCommandsStep((model, { title }) => [
    SaveTitle({ issueId: model.issueId, title }),
  ]),
  SubmittedTitle: makeStep((model, { title }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({ title: () => title })),
      makeCommandsStep(() => [SaveTitle({ issueId: model.issueId, title })]),
    ]),
  ),
  ClickedClose: makeOutMessageStep.fromMessage(({ reason }) =>
    OutMessage.Closed({ reason }),
  ),
  CompletedSaveTitle: makeNoopStep(),
})
