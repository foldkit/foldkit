import { Array } from 'effect'
import { initAndAppend } from 'foldkit/binding'

import { makeCommandsStep, makeFieldsStep } from './block'
import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding, WorkHistoryComposition } from './composition'

export const update = WorkHistoryComposition.makeUpdate({
  ClickedAddEntry: makeCommandsStep(() => [GenerateWorkHistoryEntryId()]),

  CompletedGenerateWorkHistoryEntryId: (model, { entryId }) =>
    initAndAppend(EntriesBinding, model, {
      key: entryId,
      args: [entryId, model.today],
    }),

  RemovedEntry: makeFieldsStep.fromMessage(({ entryId }) => ({
    entries: Array.filter(entry => entry.id !== entryId),
  })),
})
