import { Effect } from 'effect'
import { Block } from 'foldkit'

import { Child } from './child'
import { Message as ParentMessage } from './message'
import { Model } from './model'

const ParentDefinition = Block.makeDefinition('ParentCommands', {
  Model,
  Message: ParentMessage,
})
const ReceiveChildMessage = ParentDefinition.makeCommand('ReceiveMessage', {
  args: { message: Child.Message },
  messages: [ParentMessage.CompletedReceive],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedReceive())
  },
})

export const childMessagesStep = ParentDefinition.makeCommandsStep(() => [
  ReceiveChildMessage({
    message: Child.Message.ClickedParentCommandsStepSave(),
  }),
])
