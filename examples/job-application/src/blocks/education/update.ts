import { Array } from 'effect'
import { initAndAppend } from 'foldkit/bindingInit'

import { GenerateEducationEntryId } from './command'
import { EducationComposition, EntriesBinding } from './composition'
import { makeCommandsStep, makeFieldsStep } from './definition'

export const update = EducationComposition.makeUpdate({
  ClickedAddEntry: makeCommandsStep(() => [GenerateEducationEntryId()]),

  CompletedGenerateEducationEntryId: (model, { entryId }) =>
    initAndAppend(EntriesBinding, model, {
      key: entryId,
      args: [entryId],
    }),

  RemovedEntry: makeFieldsStep.fromMessage(({ entryId }) => ({
    entries: Array.filter(entry => entry.id !== entryId),
  })),
})
