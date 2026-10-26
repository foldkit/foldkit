import { Array } from 'effect'

import { SkillsDefinition, makeFieldsStep } from './definition'
import { SkillsEntryBlock } from './entry'

const foldEntryOutMessage = (entryId: string) =>
  SkillsDefinition.makeOutMessageFold(SkillsEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = SkillsDefinition.makeBinding(SkillsEntryBlock, {
  field: 'entries',
  key: 'id',
  init: {
    instances: initialEntryId => [
      { key: initialEntryId, args: [initialEntryId] },
    ],
    toItem: (_occurrence, entry) => entry,
  },
}).withOutMessagePolicy({
  fold: (entryId, outMessage) => foldEntryOutMessage(entryId)(outMessage),
})

export const SkillsComposition = SkillsDefinition.makeComposition({
  bindings: [EntriesBinding],
})
