import { Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { RepositoryError } from '../repository'
import { SaveIssue } from './command'
import { IssueDetailComposition, changeDraftStep } from './composition'
import {
  Message,
  type Model,
  OutMessage,
  SaveState,
  makeOutMessageStep,
  makeStep,
} from './definition'
import {
  isDirty,
  latestRevision,
  reconcileIssue,
  revisionFromIssue,
} from './draft'

const resetDraftFields = (model: typeof Model.Type) => {
  const revision = latestRevision(model)

  return {
    baseline: () => revision,
    draft: () => revision.fields,
    maybeIncomingRevision: () => Option.none(),
    saveState: () => SaveState.Idle(),
  }
}

const resetDraftStep = makeStep(model => {
  if (SaveState.guards.Saving(model.saveState)) {
    return { model }
  }

  return { model: modifyFields(model, resetDraftFields(model)) }
})

const saveIssueStep = makeStep(model => {
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

const handleInformedOfIssueChange = (
  model: typeof Model.Type,
  { issue }: typeof Message.InformedOfIssueChange.Type,
) => ({ model: reconcileIssue(model, issue) })

const isCurrentSave = (
  model: typeof Model.Type,
  issueId: string,
  expectedVersion: number,
) =>
  model.issueId === issueId &&
  SaveState.guards.Saving(model.saveState) &&
  model.saveState.expectedVersion === expectedVersion

const handleSucceededSaveIssue = (
  model: typeof Model.Type,
  { issue, expectedVersion }: typeof Message.SucceededSaveIssue.Type,
) => {
  if (!isCurrentSave(model, issue.id, expectedVersion)) {
    return { model }
  }

  const saved = revisionFromIssue(issue)
  const known = latestRevision(model)

  const baseline = known.version > saved.version ? known : saved

  return {
    model: modifyFields(model, {
      baseline: () => baseline,
      draft: () => baseline.fields,
      maybeIncomingRevision: () => Option.none(),
      saveState: () => SaveState.Idle(),
    }),
    outMessage: OutMessage.Saved({ issue }),
  }
}

const handleFailedSaveIssue = (
  model: typeof Model.Type,
  { issueId, expectedVersion, error }: typeof Message.FailedSaveIssue.Type,
) => {
  if (!isCurrentSave(model, issueId, expectedVersion)) {
    return { model }
  }

  return RepositoryError.matchOrElse(
    error,
    {
      Conflict: ({ latestIssue }) => {
        const reconciled = reconcileIssue(model, latestIssue)

        return {
          model: modifyFields(reconciled, {
            saveState: () => SaveState.Failed({ error: error.message }),
          }),
          outMessage: OutMessage.ObservedIssue({ issue: latestIssue }),
        }
      },
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

export const update = IssueDetailComposition.makeUpdate({
  UpdatedTitle: (model, { value }) =>
    changeDraftStep(draft => modifyFields(draft, { title: () => value }))(
      model,
    ),
  UpdatedDescription: (model, { value }) =>
    changeDraftStep(draft => modifyFields(draft, { description: () => value }))(
      model,
    ),
  SubmittedIssueForm: saveIssueStep,
  ClickedRetrySave: saveIssueStep,
  RequestedSave: saveIssueStep,
  InformedOfIssueChange: handleInformedOfIssueChange,
  ClickedReloadIssue: resetDraftStep,
  ClickedDiscardChanges: resetDraftStep,
  ClickedClose: makeOutMessageStep(() => OutMessage.Closed()),
  SucceededSaveIssue: handleSucceededSaveIssue,
  FailedSaveIssue: handleFailedSaveIssue,
})
