import { Effect } from 'effect'

import { Child, Message as ChildMessage } from '../child/definition'
import { Message as AncestorMessage } from './../definition'
import { Message as EntryMessage } from './entry/definition'
import { Parent } from './definition'

const AliasedEntryMessage = EntryMessage

export const RunParentWork = Parent.command('RunParentWork', {
  messages: [ChildMessage.CompletedChildWork],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedChildWork())
  },
})

export const ChildBinding = Parent.bindChild(Child.block, {
  field: 'child',
  toParentMessage: message => ChildMessage.GotChildMessage({ message }),
})

export const ParentComposition = Parent.makeComposition({
  childBindings: [ChildBinding],
})

export const update = ParentComposition.makeUpdate(model => ({
  model,
  commands: [
    AliasedEntryMessage.UpdatedEntry(),
    AncestorMessage.UpdatedAncestor(),
  ],
}))
