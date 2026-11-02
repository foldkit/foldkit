import { Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { IssueDraft } from '../domain'
import { SaveIssue } from './command'
import { makeStep } from './definition'
import { isDirty } from './draft'
import { SaveState } from './model'

export const editDraft = (transformDraft: (draft: IssueDraft) => IssueDraft) =>
  makeStep(model => ({
    model: SaveState.guards.Saving(model.saveState)
      ? model
      : modifyFields(model, { draft: transformDraft }),
  }))

export const saveIssue = makeStep(model => {
  if (
    SaveState.guards.Saving(model.saveState) ||
    Option.isSome(model.maybeIncomingRevision) ||
    !isDirty(model)
  ) {
    return { model }
  }

  if (String.isEmpty(String.trim(model.draft.title))) {
    return {
      model: modifyFields(model, {
        saveState: () =>
          SaveState.Failed({ error: 'Enter an issue title before saving.' }),
      }),
    }
  }

  return {
    model: modifyFields(model, {
      saveState: () =>
        SaveState.Saving({ expectedVersion: model.baseline.version }),
    }),
    commands: [
      SaveIssue({
        issueId: model.issueId,
        draft: model.draft,
        expectedVersion: model.baseline.version,
      }),
    ],
  }
})
