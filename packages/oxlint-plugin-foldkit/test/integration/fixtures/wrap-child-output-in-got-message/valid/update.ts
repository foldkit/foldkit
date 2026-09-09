import { Command, Update } from 'foldkit'
import { Option } from 'effect'
import { evo } from 'foldkit/struct'
import { Child } from './child'
import { GotChildMessage as wrap } from './message'
import { Model } from './model'

// UPDATE

export const update = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: message => wrap({ message }),
})

export const mapMessages = (messages: ReadonlyArray<Child.Message>) =>
  Command.mapMessages(messages, message => wrap({ message }))
