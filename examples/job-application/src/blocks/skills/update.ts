import { Array } from 'effect'
import { initAndAppend } from 'foldkit/bindingInit'

import { GenerateSkillsEntryId } from './command'
import { EntriesBinding, SkillsComposition } from './composition'
import { makeCommandsStep, makeFieldsStep } from './definition'

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
