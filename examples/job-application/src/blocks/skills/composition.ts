import { Array } from 'effect'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'
import { SkillsEntryBlock } from './blocks/skillsEntry'

const foldEntryOutMessage = (entryId: string) =>
  makeOutMessageFold(SkillsEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = makeBinding(SkillsEntryBlock, {
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

export const SkillsComposition = makeComposition({
  bindings: [EntriesBinding],
})
