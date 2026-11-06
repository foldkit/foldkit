import { modifyFields } from 'foldkit/struct'

import { Issue } from '../../domain'
import { RepositoryError } from '../../repository'
import { makeOutMessageStep, makeStep } from './block'
import { IssueDetailComposition } from './composition'
import { refreshCleanDraftFromIssue } from './draft'
import type { FailedSaveIssue, SucceededSaveIssue } from './message'
import { type Model, SaveState } from './model'
import { OutMessage } from './outMessage'
import { editDraft, saveIssue } from './steps'

const resetDraftFromIssue = (issue: Issue.Issue) =>
  makeStep(model => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    const nextBaselineRevision = Issue.toRevision(issue)

    return {
      model: modifyFields(model, {
        baselineRevision: () => nextBaselineRevision,
        draft: () => nextBaselineRevision.fields,
        saveState: () => SaveState.Idle(),
      }),
    }
  })

const isCurrentSave = (
  model: Model,
  issueId: string,
  expectedVersion: number,
) =>
  model.issueId === issueId &&
  SaveState.guards.Saving(model.saveState) &&
  model.saveState.expectedVersion === expectedVersion

const handleSucceededSaveIssue = (
  model: Model,
  { saveResult, expectedVersion }: SucceededSaveIssue,
  issue: Issue.Issue,
) => {
  if (!isCurrentSave(model, saveResult.issueId, expectedVersion)) {
    return { model }
  }

  const savedRevision = saveResult.revision
  const latestKnownRevision = Issue.toRevision(issue)

  const nextBaselineRevision =
    latestKnownRevision.version > savedRevision.version
      ? latestKnownRevision
      : savedRevision

  return {
    model: modifyFields(model, {
      baselineRevision: () => nextBaselineRevision,
      draft: () => nextBaselineRevision.fields,
      saveState: () => SaveState.Idle(),
    }),
    outMessage: OutMessage.Saved({ saveResult }),
  }
}

const handleFailedSaveIssue = (
  model: Model,
  { issueId, expectedVersion, error }: FailedSaveIssue,
) => {
  if (!isCurrentSave(model, issueId, expectedVersion)) {
    return { model }
  }

  return RepositoryError.matchOrElse(
    error,
    {
      Conflict: ({ latestIssue }) => ({
        model: modifyFields(model, {
          saveState: () => SaveState.Failed({ error: error.message }),
        }),
        outMessage: OutMessage.DetectedSaveConflict({ latestIssue }),
      }),
    },
    () => ({
      model: modifyFields(model, {
        saveState: () =>
          SaveState.Failed({
            error: error.message,
          }),
      }),
    }),
  )
}

const { makeUpdate } = IssueDetailComposition

const refreshCleanDraftBeforeUpdate = makeUpdate.each(
  (model, _message, _frame, issue: Issue.Issue) => ({
    model: refreshCleanDraftFromIssue(model, issue),
  }),
)

const updateForIssue = makeUpdate.withContext((issue: Issue.Issue) => ({
  UpdatedTitle: (model, { value }) =>
    editDraft(draft => modifyFields(draft, { title: () => value }))(model),
  UpdatedDescription: (model, { value }) =>
    editDraft(draft => modifyFields(draft, { description: () => value }))(
      model,
    ),
  SubmittedIssueForm: saveIssue(issue),
  ClickedRetrySave: saveIssue(issue),
  ClickedReloadIssue: resetDraftFromIssue(issue),
  ClickedDiscardChanges: resetDraftFromIssue(issue),
  ClickedClose: makeOutMessageStep(() => OutMessage.RequestedClose()),
  SucceededSaveIssue: (model, message) =>
    handleSucceededSaveIssue(model, message, issue),
  FailedSaveIssue: handleFailedSaveIssue,
}))

export const update = makeUpdate.compose(
  refreshCleanDraftBeforeUpdate,
  updateForIssue,
)
