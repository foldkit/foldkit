import { Array } from 'effect'
import { initAndAppend } from 'foldkit/bindingInit'

import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding, WorkHistoryComposition } from './composition'
import { type Model, makeCommandsStep, makeFieldsStep } from './definition'
import {
  hasErrors as entryHasErrors,
  isComplete as isEntryComplete,
} from './entry/update'

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

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, entryHasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, isEntryComplete)
