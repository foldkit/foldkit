import { Option } from 'effect'
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

const resetDraftFromIssue = (maybeIssue: Option.Option<Issue.Issue>) =>
  makeStep(model => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    if (Option.isNone(maybeIssue)) {
      return {
        model: modifyFields(model, {
          saveState: () =>
            SaveState.Failed({
              error: 'This issue is unavailable. Your draft has been kept.',
            }),
        }),
      }
    }

    const issue = maybeIssue.value
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
  maybeIssue: Option.Option<Issue.Issue>,
) => {
  if (!isCurrentSave(model, saveResult.issueId, expectedVersion)) {
    return { model }
  }

  const savedRevision = saveResult.revision
  const nextBaselineRevision = Option.match(maybeIssue, {
    onNone: () => savedRevision,
    onSome: issue =>
      issue.version > savedRevision.version
        ? Issue.toRevision(issue)
        : savedRevision,
  })

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
  (model, _message, _frame, maybeIssue: Option.Option<Issue.Issue>) => ({
    model: Option.match(maybeIssue, {
      onNone: () => model,
      onSome: issue => refreshCleanDraftFromIssue(model, issue),
    }),
  }),
)

const updateForIssue = makeUpdate.withContext(
  (maybeIssue: Option.Option<Issue.Issue>) => ({
    UpdatedTitle: (model, { value }) =>
      editDraft(draft => modifyFields(draft, { title: () => value }))(model),
    UpdatedDescription: (model, { value }) =>
      editDraft(draft => modifyFields(draft, { description: () => value }))(
        model,
      ),
    SubmittedIssueForm: saveIssue(maybeIssue),
    ClickedRetrySave: saveIssue(maybeIssue),
    ClickedReloadIssue: resetDraftFromIssue(maybeIssue),
    ClickedDiscardChanges: resetDraftFromIssue(maybeIssue),
    ClickedClose: makeOutMessageStep(() => OutMessage.RequestedClose()),
    SucceededSaveIssue: (model, message) =>
      handleSucceededSaveIssue(model, message, maybeIssue),
    FailedSaveIssue: handleFailedSaveIssue,
  }),
)

export const update = makeUpdate.compose(
  refreshCleanDraftBeforeUpdate,
  updateForIssue,
)
