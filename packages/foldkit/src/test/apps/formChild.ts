import { Effect, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'

// CHILD MODEL

export const ChildModel = S.Struct({
  status: S.Literals(['Idle', 'Submitting', 'Submitted']),
})
export type ChildModel = typeof ChildModel.Type

// CHILD MESSAGE

export const ChildMessage = defineMessageUnion({
  SubmittedForm: {},
  SucceededSubmitForm: { id: S.String },
  CancelledForm: {},
  CompletedResetForm: {},
})

export const {
  SubmittedForm,
  SucceededSubmitForm,
  CancelledForm,
  CompletedResetForm,
} = ChildMessage

export type ChildMessage = typeof ChildMessage.Type

// CHILD OUT MESSAGE

export const ChildOutMessage = defineMessageUnion({
  RequestedSave: { id: S.String },
  RequestedCancel: {},
})

export const { RequestedSave, RequestedCancel } = ChildOutMessage

export type ChildOutMessage = typeof ChildOutMessage.Type

// CHILD COMMAND

export const SubmitForm = Command.define('SubmitForm', {
  messages: [ChildMessage.SucceededSubmitForm],
  execute: Effect.sync(() => ChildMessage.SucceededSubmitForm({ id: 'abc' })),
})

export const ResetForm = Command.define('ResetForm', {
  messages: [ChildMessage.CompletedResetForm],
  execute: Effect.sync(() => ChildMessage.CompletedResetForm()),
})

// CHILD INIT

export const initialChildModel: ChildModel = { status: 'Idle' }

// CHILD UPDATE

type ChildUpdateReturn = Readonly<{
  model: ChildModel
  commands?: ReadonlyArray<Command.Command<ChildMessage>>
  outMessage?: ChildOutMessage
}>

export const childUpdate = (_model: ChildModel, message: ChildMessage) =>
  ChildMessage.match<ChildUpdateReturn>(message, {
    SubmittedForm: () => ({
      model: { status: 'Submitting' },
      commands: [SubmitForm()],
    }),
    SucceededSubmitForm: ({ id }) => ({
      model: { status: 'Submitted' },
      commands: [ResetForm()],
      outMessage: ChildOutMessage.RequestedSave({ id }),
    }),
    CancelledForm: () => ({
      model: { status: 'Idle' },
      outMessage: ChildOutMessage.RequestedCancel(),
    }),
    CompletedResetForm: () => ({ model: { status: 'Idle' } }),
  })

// PARENT MODEL

export const ParentModel = S.Struct({
  child: ChildModel,
  savedIds: S.Array(S.String),
  cancelled: S.Boolean,
})
export type ParentModel = typeof ParentModel.Type

// PARENT MESSAGE

export const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
  CompletedParentReset: {},
})

export const { GotChildMessage, CompletedParentReset } = ParentMessage

export type ParentMessage = typeof ParentMessage.Type

// PARENT INIT

export const initialParentModel: ParentModel = {
  child: { status: 'Idle' },
  savedIds: [],
  cancelled: false,
}

// PARENT UPDATE

type ParentUpdateReturn = Readonly<{
  model: ParentModel
  commands?: ReadonlyArray<Command.Command<ParentMessage>>
  outMessage?: never
}>

export const parentUpdate = (
  parentModel: ParentModel,
  message: ParentMessage,
) =>
  ParentMessage.match<ParentUpdateReturn>(message, {
    GotChildMessage: ({ message: childMessage }) => {
      const childUpdateResult = childUpdate(parentModel.child, childMessage)
      const nextParent =
        childUpdateResult.outMessage === undefined
          ? { ...parentModel, child: childUpdateResult.model }
          : ChildOutMessage.match<ParentModel>(childUpdateResult.outMessage, {
              RequestedSave: ({ id }) => ({
                ...parentModel,
                child: childUpdateResult.model,
                savedIds: [...parentModel.savedIds, id],
              }),
              RequestedCancel: () => ({
                ...parentModel,
                child: childUpdateResult.model,
                cancelled: true,
              }),
            })
      const mappedCommands = Command.mapMessages(
        childUpdateResult.commands ?? [],
        childMessage =>
          ParentMessage.GotChildMessage({ message: childMessage }),
      )
      return { model: nextParent, commands: mappedCommands }
    },
    CompletedParentReset: () => ({ model: parentModel }),
  })
