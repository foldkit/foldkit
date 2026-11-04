import { Array } from 'effect'

import { SkillsEntryBlock } from './blocks/skillsEntry'
import { SkillsBlock, makeFieldsStep } from './definition'

const foldEntryOutMessage = (entryId: string) =>
  SkillsBlock.makeOutMessageFold(SkillsEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = SkillsBlock.makeBinding(SkillsEntryBlock, {
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

export const SkillsComposition = SkillsBlock.makeComposition({
  bindings: [EntriesBinding],
})
