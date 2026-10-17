import { Array, Option } from 'effect'
import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message, type Model, Skills } from './definition'
import * as Entry from './entry'

const foldEntryOutMessage = (
  entryId: string,
  outMessage: typeof Entry.OutMessage.Type,
) =>
  Entry.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    Removed: () => model => ({
      model: modifyFields(model, {
        entries: Array.filter(entry => entry.id !== entryId),
      }),
    }),
  })

export const EntriesBinding = Skills.bindChild(Entry.block, {
  field: 'entries',
  key: 'id',
  toParentMessage: (entryId, message) =>
    Message.GotEntryMessage({ entryId, message }),
  fromParentMessage: {
    parentMessage: Message.GotEntryMessage,
    args: (_model, { entryId, message }) => Option.some([entryId, message]),
  },
  init: {
    occurrences: initialEntryId => [
      { key: initialEntryId, args: [initialEntryId] },
    ],
    toItem: (_occurrence, entry) => entry,
  },
  outMessage: { fold: foldEntryOutMessage },
})

export const SkillsComposition = Skills.makeComposition({
  childBindings: [EntriesBinding],
})
