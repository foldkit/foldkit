import { Array } from 'effect'

import { WorkHistoryDefinition, makeFieldsStep } from './definition'
import { WorkHistoryEntryBlock } from './entry'

const foldEntryOutMessage = (entryId: string) =>
  WorkHistoryDefinition.makeOutMessageFold(WorkHistoryEntryBlock, {
    Removed: () =>
      makeFieldsStep(() => ({
        entries: Array.filter(entry => entry.id !== entryId),
      })),
  })

export const EntriesBinding = WorkHistoryDefinition.makeBinding(
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

export const WorkHistoryComposition = WorkHistoryDefinition.makeComposition({
  bindings: [EntriesBinding],
})
