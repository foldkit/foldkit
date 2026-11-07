import { Array } from 'effect'

import {
  makeComposition,
  makeFieldsStep,
  makeKeyedArrayBinding,
  makeOutMessageFold,
} from './block'
import { WorkHistoryEntryBlock } from './blocks/workHistoryEntry'

export const EntriesBinding = makeKeyedArrayBinding(WorkHistoryEntryBlock, {
  field: 'entries',
  key: 'id',
  init: {
    instances: ({ today, initialEntryId }) => [
      { key: initialEntryId, args: [initialEntryId, today] },
    ],
  },
}).withOutMessagePolicy({
  fold: entryId =>
    makeOutMessageFold(WorkHistoryEntryBlock, {
      Removed: () =>
        makeFieldsStep(() => ({
          entries: Array.filter(entry => entry.id !== entryId),
        })),
    }),
})

export const WorkHistoryComposition = makeComposition({
  bindings: [EntriesBinding],
})
