import { Option, Schema, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { hasDraft } from '../commentComposer/draft'
import { Issue, IssueDraft, IssueRevision } from '../domain'
import { type Model, SaveState } from './definition'

export const draftFromIssue = (issue: typeof Issue.Type) =>
  IssueDraft.make({
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    projectId: issue.projectId,
    maybeAssigneeId: issue.maybeAssigneeId,
    labelIds: issue.labelIds,
  })

export const revisionFromIssue = (issue: typeof Issue.Type) =>
  IssueRevision.make({ version: issue.version, fields: draftFromIssue(issue) })

export const CONFLICT_MESSAGE =
  'This issue changed while you were editing. Your draft is preserved. Reload the issue to use the latest version.'

const equivalentDraft = Schema.toEquivalence(IssueDraft)

type ReconciliationState = Pick<
  typeof Model.Type,
  'issueId' | 'baseline' | 'draft' | 'maybeIncomingRevision' | 'saveState'
>

export const isDirty = (state: ReconciliationState) =>
  !equivalentDraft(state.draft, state.baseline.fields)

export const latestRevision = (state: ReconciliationState) =>
  Option.getOrElse(state.maybeIncomingRevision, () => state.baseline)

export const reconcileIssue = (
  state: ReconciliationState,
  issue: typeof Issue.Type,
): ReconciliationState => {
  if (
    issue.id !== state.issueId ||
    issue.version <= latestRevision(state).version
  ) {
    return state
  }

  const incoming = revisionFromIssue(issue)

  const isEditing = isDirty(state)
  const matchesDraft = equivalentDraft(incoming.fields, state.draft)
  const isCompatible =
    equivalentDraft(incoming.fields, state.baseline.fields) || matchesDraft

  if (isEditing && !isCompatible) {
    return modifyFields(state, {
      maybeIncomingRevision: () => Option.some(incoming),
    })
  }

  return modifyFields(state, {
    baseline: () => incoming,
    draft: draft => (isEditing ? draft : incoming.fields),
    maybeIncomingRevision: () => Option.none(),
    saveState: saveState =>
      SaveState.guards.Saving(saveState) || (isEditing && !matchesDraft)
        ? saveState
        : SaveState.Idle(),
  })
}

export const maybeDraftSummary = (model: typeof Model.Type) => {
  if (!isDirty(model) && !hasDraft(model.commentComposer)) {
    return Option.none()
  }

  const title = String.trim(model.draft.title)

  return Option.some({
    issueId: model.issueId,
    title: String.isEmpty(title) ? model.baseline.fields.title : title,
  })
}
