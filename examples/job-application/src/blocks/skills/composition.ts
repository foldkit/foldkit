import { Array } from 'effect'

import {
  makeComposition,
  makeFieldsStep,
  makeKeyedArrayBinding,
  makeOutMessageFold,
} from './block'
import { SkillsEntryBlock } from './blocks/skillsEntry'

export const EntriesBinding = makeKeyedArrayBinding(SkillsEntryBlock, {
  field: 'entries',
  key: 'id',
  init: {
    instances: initialEntryId => [
      { key: initialEntryId, args: [initialEntryId] },
    ],
  },
}).withOutMessagePolicy({
  fold: entryId =>
    makeOutMessageFold(SkillsEntryBlock, {
      Removed: () =>
        makeFieldsStep(() => ({
          entries: Array.filter(entry => entry.id !== entryId),
        })),
    }),
})

export const SkillsComposition = makeComposition({
  bindings: [EntriesBinding],
})
