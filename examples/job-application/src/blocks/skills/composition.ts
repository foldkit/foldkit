import { Array } from 'effect'

import {
  makeComposition,
  makeFieldsStep,
  makeKeyedArrayBinding,
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

export const EntriesBinding = makeKeyedArrayBinding(SkillsEntryBlock, {
  field: 'entries',
  key: 'id',
  init: {
    instances: initialEntryId => [
      { key: initialEntryId, args: [initialEntryId] },
    ],
    toItem: (_occurrence, entry) => entry,
  },
}).withOutMessagePolicy({
  fold: foldEntryOutMessage,
})

export const SkillsComposition = makeComposition({
  bindings: [EntriesBinding],
})
