import { Array } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { GenerateSkillsEntryId } from './command'
import { EntriesBinding, SkillsComposition } from './composition'
import { Message, type Model } from './definition'
import * as Entry from './entry'

export const update = SkillsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedAddEntry: () => ({ model, commands: [GenerateSkillsEntryId()] }),

    SucceededGenerateSkillsEntryId: ({ entryId }) =>
      EntriesBinding.init({
        key: entryId,
        args: [entryId],
        toParentModel: entry =>
          modifyFields(model, { entries: Array.append(entry) }),
      }),

    FailedGenerateSkillsEntryId: () => ({ model }),

    RemovedEntry: ({ entryId }) => ({
      model: modifyFields(model, {
        entries: Array.filter(entry => entry.id !== entryId),
      }),
    }),
  }),
)

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, Entry.isComplete)

export const revealErrors = (model: Model): Model =>
  modifyFields(model, { entries: Array.map(Entry.revealErrors) })
