import { Array } from 'effect'
import { initAndAppend } from 'foldkit/bindingInit'

import {
  hasErrors as entryHasErrors,
  isComplete as isEntryComplete,
} from './blocks/skillsEntry'
import { GenerateSkillsEntryId } from './command'
import { EntriesBinding, SkillsComposition } from './composition'
import { type Model, makeCommandsStep, makeFieldsStep } from './definition'

export const update = SkillsComposition.makeUpdate({
  ClickedAddEntry: makeCommandsStep(() => [GenerateSkillsEntryId()]),

  CompletedGenerateSkillsEntryId: (model, { entryId }) =>
    initAndAppend(EntriesBinding, model, {
      key: entryId,
      args: [entryId],
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
