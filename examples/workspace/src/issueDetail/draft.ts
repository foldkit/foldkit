import { Option, Schema, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { isDraftNonEmpty } from '../commentComposer/draft'
import { Issue, IssueDraft, revisionFromIssue } from '../domain'
import { type Model, SaveState } from './model'

export const CONFLICT_MESSAGE =
  'This issue changed while you were editing. Your draft is preserved. Reload the issue to use the latest version.'

const equivalentDraft = Schema.toEquivalence(IssueDraft)

type ReconciliationState = Pick<
  typeof Model.Type,
  'issueId' | 'baseline' | 'draft' | 'maybeIncomingRevision' | 'saveState'
>

export const isDirty = (model: ReconciliationState) =>
  !equivalentDraft(model.draft, model.baseline.fields)

export const latestRevision = (model: ReconciliationState) =>
  Option.getOrElse(model.maybeIncomingRevision, () => model.baseline)

export const reconcileIssue = (
  model: typeof Model.Type,
  issue: typeof Issue.Type,
) => {
  if (
    issue.id !== model.issueId ||
    issue.version <= latestRevision(model).version
  ) {
    return model
  }

  const incomingRevision = revisionFromIssue(issue)

  const isDraftDirty = isDirty(model)
  const isDraftMatch = equivalentDraft(incomingRevision.fields, model.draft)
  const isCompatible =
    equivalentDraft(incomingRevision.fields, model.baseline.fields) ||
    isDraftMatch

  if (isDraftDirty && !isCompatible) {
    return modifyFields(model, {
      maybeIncomingRevision: () => Option.some(incomingRevision),
    })
  }

  return modifyFields(model, {
    baseline: () => incomingRevision,
    draft: draft => (isDraftDirty ? draft : incomingRevision.fields),
    maybeIncomingRevision: () => Option.none(),
    saveState: saveState =>
      SaveState.guards.Saving(saveState) || (isDraftDirty && !isDraftMatch)
        ? saveState
        : SaveState.Idle(),
  })
}

export const maybeDraftSummary = (model: typeof Model.Type) => {
  if (!isDirty(model) && !isDraftNonEmpty(model.commentComposer)) {
    return Option.none()
  }

  const title = String.trim(model.draft.title)

  return Option.some({
    issueId: model.issueId,
    title: String.isEmpty(title) ? model.baseline.fields.title : title,
  })
}
