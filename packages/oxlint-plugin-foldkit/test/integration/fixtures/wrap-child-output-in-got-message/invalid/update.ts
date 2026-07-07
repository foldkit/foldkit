import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Child } from './child'
import { ForwardedChildMessage } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model, message: Child.Message) => {
  const [childModel, childCommands] = Child.update(model.child, message)
  const commands = Command.mapMessages(childCommands, (childMessage) =>
    ForwardedChildMessage({ message: childMessage }),
  )
  return [evo(model, { child: () => childModel }), commands]
}
