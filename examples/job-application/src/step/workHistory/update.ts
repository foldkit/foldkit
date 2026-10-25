import { Array } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding, WorkHistoryComposition } from './composition'
import { type Model, WorkHistoryDefinition } from './definition'
import {
  hasErrors as entryHasErrors,
  isComplete as isEntryComplete,
} from './entry/update'

export const update = WorkHistoryComposition.makeUpdate({
  ClickedAddEntry: WorkHistoryDefinition.makeCommandsStep(() => [
    GenerateWorkHistoryEntryId(),
  ]),

  SucceededGenerateWorkHistoryEntryId: (model, { entryId }) =>
    EntriesBinding.init({
      key: entryId,
      args: [entryId, model.today],
      toParentModel: entry =>
        modifyFields(model, { entries: Array.append(entry) }),
    }),

  FailedGenerateWorkHistoryEntryId: WorkHistoryDefinition.makeNoopStep(),

  RemovedEntry: WorkHistoryDefinition.makeFieldsStep.fromMessage(
    ({ entryId }) => ({
      entries: Array.filter(entry => entry.id !== entryId),
    }),
  ),

  RequestedRevealErrors: model =>
    Update.combineSteps(
      model,
      Array.map(model.entries, entry =>
        EntriesBinding.requestRevealErrors(entry.id),
      ),
    ),
})

export const hasErrors = (model: typeof Model.Type): boolean =>
  Array.some(model.entries, entryHasErrors)

export const isComplete = (model: typeof Model.Type): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, isEntryComplete)
