import { Array } from 'effect'
import { Update } from 'foldkit'
import { initAndAppend } from 'foldkit/bindingInit'

import { GenerateEducationEntryId } from './command'
import { EducationComposition, EntriesBinding } from './composition'
import {
  type Model,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
} from './definition'
import {
  hasErrors as entryHasErrors,
  isComplete as isEntryComplete,
} from './entry/update'

export const update = EducationComposition.makeUpdate({
  ClickedAddEntry: makeCommandsStep(() => [GenerateEducationEntryId()]),

  SucceededGenerateEducationEntryId: (model, { entryId }) =>
    initAndAppend(EntriesBinding, model, {
      key: entryId,
      args: [entryId],
    }),

  FailedGenerateEducationEntryId: makeNoopStep(),

  RemovedEntry: makeFieldsStep.fromMessage(({ entryId }) => ({
    entries: Array.filter(entry => entry.id !== entryId),
  })),

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
