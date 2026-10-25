import { Effect } from 'effect'

import { Child, Message as ChildMessage } from '../child/definition'
import { Message as AncestorMessage } from './../definition'
import { Message as EntryMessage } from './entry/definition'
import { ParentDefinition } from './definition'

const AliasedEntryMessage = EntryMessage

export const RunParentWork = ParentDefinition.makeCommand('RunParentWork', {
  messages: [ChildMessage.CompletedChildWork],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedChildWork())
  },
})

export const ChildBinding = ParentDefinition.makeBinding(Child.block, {
  field: 'child',
  toParentMessage: message => ChildMessage.GotChildMessage({ message }),
})

export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})

export const update = ParentComposition.makeUpdate({
  ClickedSave: model => ({
    model,
    commands: [
      AliasedEntryMessage.UpdatedEntry(),
      AncestorMessage.UpdatedAncestor(),
    ],
  }),
})
