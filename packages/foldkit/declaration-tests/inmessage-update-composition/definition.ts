import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import { EditorBlock } from './editor.js'

export class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{ save: (text: string) => Effect.Effect<void> }>
>()('InputDraftStore') {}
export const Model = Schema.Struct({
  editor: EditorBlock.Model,
  count: Schema.Number,
  snapshots: Schema.Array(Schema.Number),
  seen: Schema.Array(Schema.String),
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedIncrement: {},
  SubmittedForm: { text: Schema.String },
  CompletedSaveDraft: {},
})
export const InMessage = defineMessageUnion({
  RequestedSet: { value: Schema.Number },
  RequestedSubmit: { text: Schema.String },
  RequestedSave: { text: Schema.String },
})
export const OutMessage = defineMessageUnion({
  Submitted: { text: Schema.String },
})
export const ApplicationKey = Symbol('InputApplication')
export const ApplicationDefinition = Block.makeDefinition('InputApplication', {
  key: ApplicationKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([]),
  effects: { services: [DraftStore] },
  inMessageOutputs: { RequestedSubmit: { outMessage: OutMessage.Submitted } },
})
export const {
  makeFieldsStep,
  makeCommandsStep,
  makeOutMessageStep,
  makeNoopStep,
} = ApplicationDefinition
export const SaveDraft = ApplicationDefinition.makeCommand('SaveDraft', {
  args: { text: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const store = yield* DraftStore

    return ({ text }) =>
      store.save(text).pipe(Effect.as(Message.CompletedSaveDraft()))
  },
})
