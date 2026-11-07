import { Array } from 'effect'
import { initAndAppend } from 'foldkit/binding'

import { makeCommandsStep, makeFieldsStep } from './block'
import { GenerateEducationEntryId } from './command'
import { EducationComposition, EntriesBinding } from './composition'

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
