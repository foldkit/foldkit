import { Array } from 'effect'
import type { Block } from 'foldkit'

import { EducationDefinition, makeFieldsStep } from './definition'
import { EducationEntryBlock } from './entry'

const foldEntryOutMessage = (entryId: string) =>
  EducationDefinition.makeOutMessageFold(EducationEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = EducationDefinition.makeBinding(
  EducationEntryBlock,
  {
    field: 'entries',
    key: 'id',
    init: {
      instances: ({ initialEntryId }) => [
        { key: initialEntryId, args: [initialEntryId] },
      ],
      toItem: (_occurrence, entry) => entry,
    },
  },
).withOutMessagePolicy({
  fold: (entryId, outMessage) => foldEntryOutMessage(entryId)(outMessage),
})

export const EducationComposition = EducationDefinition.makeComposition({
  bindings: [EntriesBinding],
})
export type EducationViewBuilder = Block.ViewBuilderFor<
  typeof EducationComposition
>
