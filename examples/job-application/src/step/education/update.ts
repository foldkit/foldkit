import { Array } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { GenerateEducationEntryId } from './command'
import { EducationComposition, EntriesBinding } from './composition'
import { EducationDefinition, type Model } from './definition'
import {
  hasErrors as entryHasErrors,
  isComplete as isEntryComplete,
} from './entry/update'

export const update = EducationComposition.makeUpdate({
  ClickedAddEntry: EducationDefinition.makeCommandsStep(() => [
    GenerateEducationEntryId(),
  ]),

  SucceededGenerateEducationEntryId: (model, { entryId }) =>
    EntriesBinding.init({
      key: entryId,
      args: [entryId],
      toParentModel: entry =>
        modifyFields(model, { entries: Array.append(entry) }),
    }),

  FailedGenerateEducationEntryId: EducationDefinition.makeNoopStep(),

  RemovedEntry: EducationDefinition.makeFieldsStep.fromMessage(
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
