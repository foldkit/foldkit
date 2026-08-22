import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Child } from './child'
import { ForwardedChildMessage } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model, message: Child.Message) => {
  const childUpdate = Child.update(model.child, message)
  const commands = Command.mapMessages(
    childUpdate.commands ?? [],
    childMessage => ForwardedChildMessage({ message: childMessage }),
  )
  return {
    model: evo(model, { child: () => childUpdate.model }),
    commands,
  }
}
