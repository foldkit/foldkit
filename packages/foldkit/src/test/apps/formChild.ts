import { Array, Effect, Layer, Schema } from 'effect'

import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'

// CHILD MODEL

export const ChildModel = Schema.Struct({
  status: Schema.Literals(['Idle', 'Submitting', 'Submitted']),
})
export type ChildModel = typeof ChildModel.Type

// CHILD MESSAGE

export const ChildMessage = defineMessageUnion({
  SubmittedForm: {},
  SucceededSubmitForm: { id: Schema.String },
  CancelledForm: {},
  CompletedResetForm: {},
})
export type ChildMessage = typeof ChildMessage.Type

// CHILD OUT MESSAGE

export const ChildOutMessage = defineMessageUnion({
  RequestedSave: { id: Schema.String },
  RequestedCancel: {},
})
export type ChildOutMessage = typeof ChildOutMessage.Type

// CHILD COMMAND

export const SubmitForm = Command.define('SubmitForm', {
  messages: [ChildMessage.SucceededSubmitForm],
  handler: function* () {
    return () =>
      Effect.sync(() => ChildMessage.SucceededSubmitForm({ id: 'abc' }))
  },
})

export const ResetForm = Command.define('ResetForm', {
  messages: [ChildMessage.CompletedResetForm],
  handler: function* () {
    return () => Effect.sync(() => ChildMessage.CompletedResetForm())
  },
})

// CHILD INIT

export const initialChildModel: ChildModel = { status: 'Idle' }

// CHILD UPDATE

type ChildUpdateReturn = Update.ReturnWithOutMessage<
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  Command.HandlerOf<typeof SubmitForm> | Command.HandlerOf<typeof ResetForm>
>

export const childUpdate = (_model: ChildModel, message: ChildMessage) =>
  ChildMessage.match<ChildUpdateReturn>(message, {
    SubmittedForm: () => ({
      model: ChildModel.make({ status: 'Submitting' }),
      commands: [SubmitForm()],
    }),
    SucceededSubmitForm: ({ id }) => ({
      model: ChildModel.make({ status: 'Submitted' }),
      commands: [ResetForm()],
      outMessage: ChildOutMessage.RequestedSave({ id }),
    }),
    CancelledForm: () => ({
      model: ChildModel.make({ status: 'Idle' }),
      outMessage: ChildOutMessage.RequestedCancel(),
    }),
    CompletedResetForm: () => ({
      model: ChildModel.make({ status: 'Idle' }),
    }),
  })

// PARENT MODEL

export const ParentModel = Schema.Struct({
  child: ChildModel,
  savedIds: Schema.Array(Schema.String),
  cancelled: Schema.Boolean,
})
export type ParentModel = typeof ParentModel.Type

// PARENT MESSAGE

export const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
  CompletedParentReset: {},
})
export type ParentMessage = typeof ParentMessage.Type

// PARENT INIT

export const initialParentModel: ParentModel = {
  child: { status: 'Idle' },
  savedIds: [],
  cancelled: false,
}

// PARENT UPDATE

const foldChildOutMessage = ChildOutMessage.match<
  Update.Step<ParentModel, ParentMessage>
>({
  RequestedSave:
    ({ id }) =>
    model => ({
      model: modifyFields(model, { savedIds: Array.append(id) }),
    }),
  RequestedCancel: () => model => ({
    model: modifyFields(model, { cancelled: () => true }),
  }),
})

const foldChildUpdate = (
  parentModel: ParentModel,
  childMessage: ChildMessage,
) => {
  const childResult = childUpdate(parentModel.child, childMessage)
  const commands = Command.mapMessages(childResult.commands ?? [], message =>
    ParentMessage.GotChildMessage({ message }),
  )
  const nextParentModel = modifyFields(parentModel, {
    child: () => childResult.model,
  })

  return childResult.outMessage === undefined
    ? { model: nextParentModel, commands }
    : Update.combineSteps(nextParentModel, [
        stepModel => ({ model: stepModel, commands }),
        foldChildOutMessage(childResult.outMessage),
      ])
}

export const parentUpdate = (
  parentModel: ParentModel,
  message: ParentMessage,
) =>
  ParentMessage.match(message, {
    GotChildMessage: ({ message: childMessage }) =>
      foldChildUpdate(parentModel, childMessage),
    CompletedParentReset: () => ({ model: parentModel }),
  })

export const EffectsLayer = Layer.mergeAll(SubmitForm.layer, ResetForm.layer)
