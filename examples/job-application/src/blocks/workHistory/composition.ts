import { Array } from 'effect'

import { WorkHistoryEntryBlock } from './blocks/workHistoryEntry'
import { WorkHistoryBlock, makeFieldsStep } from './definition'

const foldEntryOutMessage = (entryId: string) =>
  WorkHistoryBlock.makeOutMessageFold(WorkHistoryEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = WorkHistoryBlock.makeBinding(
  WorkHistoryEntryBlock,
  {
    field: 'entries',
    key: 'id',
    init: {
      instances: ({ today, initialEntryId }) => [
        { key: initialEntryId, args: [initialEntryId, today] },
      ],
      toItem: (_occurrence, entry) => entry,
    },
  },
).withOutMessagePolicy({
  fold: (entryId, outMessage) => foldEntryOutMessage(entryId)(outMessage),
})

export const WorkHistoryComposition = WorkHistoryBlock.makeComposition({
  bindings: [EntriesBinding],
})
