import { Array } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { GenerateSkillsEntryId } from './command'
import { EntriesBinding, SkillsComposition } from './composition'
import { type Model, SkillsDefinition } from './definition'
import {
  hasErrors as entryHasErrors,
  isComplete as isEntryComplete,
} from './entry/update'

export const update = SkillsComposition.makeUpdate({
  ClickedAddEntry: SkillsDefinition.makeCommandsStep(() => [
    GenerateSkillsEntryId(),
  ]),

  SucceededGenerateSkillsEntryId: (model, { entryId }) =>
    EntriesBinding.init({
      key: entryId,
      args: [entryId],
      toParentModel: entry =>
        modifyFields(model, { entries: Array.append(entry) }),
    }),

  FailedGenerateSkillsEntryId: SkillsDefinition.makeNoopStep(),

  RemovedEntry: SkillsDefinition.makeFieldsStep.fromMessage(({ entryId }) => ({
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
