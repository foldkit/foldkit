import { Array } from 'effect'
import { Update } from 'foldkit'
import { initAndAppend } from 'foldkit/bindingInit'

import { GenerateSkillsEntryId } from './command'
import { EntriesBinding, SkillsComposition } from './composition'
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

export const update = SkillsComposition.makeUpdate({
  ClickedAddEntry: makeCommandsStep(() => [GenerateSkillsEntryId()]),

  SucceededGenerateSkillsEntryId: (model, { entryId }) =>
    initAndAppend(EntriesBinding, model, {
      key: entryId,
      args: [entryId],
    }),

  FailedGenerateSkillsEntryId: makeNoopStep(),

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

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, entryHasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, isEntryComplete)
