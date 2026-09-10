import { Command as ChildCommand } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Child } from './child'
import { ForwardedChildMessage } from './message'
import { Model } from './model'

const GotLocallyShadowedMessage = (input: { message: Child.Message }) => input

// UPDATE

export const update = (model: Model, message: Child.Message) => {
  const childUpdate = Child.update(model.child, message)
  const commands = ChildCommand.mapMessages(
    childUpdate.commands,
    childMessage => ForwardedChildMessage({ message: childMessage }),
  )
  const shadowedCommands = ChildCommand.mapMessages(
    childUpdate.commands,
    childMessage => GotLocallyShadowedMessage({ message: childMessage }),
  )
  return {
    model: evo(model, { child: () => childUpdate.model }),
    commands: [...commands, ...shadowedCommands],
  }
}
