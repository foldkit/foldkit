import { Array } from 'effect'
import type { Block } from 'foldkit'

import {
  makeComposition,
  makeFieldsStep,
  makeKeyedArrayBinding,
  makeOutMessageFold,
} from './block'
import { EducationEntryBlock } from './blocks/educationEntry'

const foldEntryOutMessage = (entryId: string) =>
  makeOutMessageFold(EducationEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = makeKeyedArrayBinding(EducationEntryBlock, {
  field: 'entries',
  key: 'id',
  init: {
    instances: ({ initialEntryId }) => [
      { key: initialEntryId, args: [initialEntryId] },
    ],
    toItem: (_occurrence, entry) => entry,
  },
}).withOutMessagePolicy({
  fold: foldEntryOutMessage,
})

export const EducationComposition = makeComposition({
  bindings: [EntriesBinding],
})
export type EducationViewBuilder = Block.ViewBuilderFor<
  typeof EducationComposition
>
