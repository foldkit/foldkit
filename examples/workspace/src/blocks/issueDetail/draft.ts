import { Option, Schema, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { Issue } from '../../domain'
import { CommentComposer } from './blocks'
import { type Model, SaveState } from './model'

export const CONFLICT_MESSAGE =
  'This issue changed while you were editing. Your draft is preserved. Reload the issue to use the latest version.'

const areDraftsEqual = Schema.toEquivalence(Issue.Draft)

const hasChangesFromBaseline = (model: Model) =>
  !areDraftsEqual(model.draft, model.baselineRevision.fields)

export const draftForDisplay = (model: Model, issue: Issue.Issue) =>
  hasChangesFromBaseline(model) ? model.draft : Issue.toDraft(issue)

export const hasUnsavedIssueChanges = (model: Model, issue: Issue.Issue) =>
  hasChangesFromBaseline(model) &&
  !areDraftsEqual(model.draft, Issue.toDraft(issue))

export const hasConflict = (model: Model, issue: Issue.Issue) =>
  hasUnsavedIssueChanges(model, issue) &&
  issue.version > model.baselineRevision.version &&
  !areDraftsEqual(Issue.toDraft(issue), model.baselineRevision.fields)

export const refreshCleanDraftFromIssue = (
  model: Model,
  issue: Issue.Issue,
) => {
  if (
    SaveState.guards.Saving(model.saveState) ||
    hasUnsavedIssueChanges(model, issue) ||
    issue.version <= model.baselineRevision.version
  ) {
    return model
  }

  const nextBaselineRevision = Issue.toRevision(issue)

  return modifyFields(model, {
    baselineRevision: () => nextBaselineRevision,
    draft: () => nextBaselineRevision.fields,
    saveState: () => SaveState.Idle(),
  })
}

export const maybeUnsavedChangesSummary = (
  model: Model,
  issue: Issue.Issue,
) => {
  if (
    !hasUnsavedIssueChanges(model, issue) &&
    !CommentComposer.hasCommentDraft(model.commentComposer)
  ) {
    return Option.none()
  }

  const title = String.trim(draftForDisplay(model, issue).title)

  return Option.some({
    issueId: model.issueId,
    title: String.isEmpty(title) ? issue.title : title,
  })
}
