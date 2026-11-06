import { String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { type Issue } from '../../domain'
import { makeStep } from './block'
import { SaveIssue } from './command'
import { hasConflict, hasUnsavedIssueChanges } from './draft'
import { SaveState } from './model'

export const editDraft = (
  transformDraft: (draft: Issue.Draft) => Issue.Draft,
) =>
  makeStep(model => ({
    model: SaveState.guards.Saving(model.saveState)
      ? model
      : modifyFields(model, { draft: transformDraft }),
  }))

export const saveIssue = (issue: Issue.Issue) =>
  makeStep(model => {
    if (
      SaveState.guards.Saving(model.saveState) ||
      hasConflict(model, issue) ||
      !hasUnsavedIssueChanges(model, issue)
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
        saveState: () => SaveState.Saving({ expectedVersion: issue.version }),
      }),
      commands: [
        SaveIssue({
          issueId: model.issueId,
          draft: model.draft,
          expectedVersion: issue.version,
        }),
      ],
    }
  })
