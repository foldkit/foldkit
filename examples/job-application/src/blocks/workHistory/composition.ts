import { Array } from 'effect'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'
import { WorkHistoryEntryBlock } from './blocks/workHistoryEntry'

const foldEntryOutMessage = (entryId: string) =>
  makeOutMessageFold(WorkHistoryEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = makeBinding(WorkHistoryEntryBlock, {
  field: 'entries',
  key: 'id',
  init: {
    instances: ({ today, initialEntryId }) => [
      { key: initialEntryId, args: [initialEntryId, today] },
    ],
    toItem: (_occurrence, entry) => entry,
  },
}).withOutMessagePolicy({
  fold: foldEntryOutMessage,
})

export const WorkHistoryComposition = makeComposition({
  bindings: [EntriesBinding],
})
