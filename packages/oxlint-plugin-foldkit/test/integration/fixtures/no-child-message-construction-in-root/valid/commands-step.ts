import { Effect, Schema } from 'effect'
import { Block, Update } from 'foldkit'

import { Child } from './child'
import { ChildBinding } from './composition'
import { Message as ParentMessage } from './message'
import { Model } from './model'

const ChildDefinition = Block.makeDefinition('ChildCommands', {
  Model: Child.Model,
  Message: Child.Message,
})
const DeliverChildMessage = ChildDefinition.makeCommand('DeliverMessage', {
  args: { message: Child.Message },
  messages: [Child.Message],
  handler: function* () {
    return ({ message }) => Effect.succeed(message)
  },
})

export const ownMessagesStep = ChildDefinition.makeCommandsStep(() => [
  DeliverChildMessage({
    message: Child.Message.ClickedOwnCommandsStepSave(),
  }),
])

const ParentDefinition = Block.makeDefinition('ParentCommands', {
  Model,
  Message: ParentMessage,
})
const Continue = ParentDefinition.makeCommand('Continue', {
  messages: [ParentMessage.CompletedContinue],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedContinue())
  },
})

export const saveAndContinueStep = Update.combineSteps([
  ChildBinding.requestSave(),
  ParentDefinition.makeCommandsStep(() => [Continue()]),
])

const Record = Schema.Struct({ count: Schema.Number })
const independent = {
  makeCommandsStep: (
    callback: (record: typeof Record.Type) => ReadonlyArray<typeof Record.Type>,
  ) => callback,
}

export const unrelated = independent.makeCommandsStep(record => [
  Record.make({ count: record.count }),
])
