import { Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { RepositoryError } from '../repository'
import { SaveIssue } from './command'
import { IssueDetailComposition } from './composition'
import { makeOutMessageStep, makeStep } from './definition'
import { isDirty, latestRevision, reconcileIssue } from './draft'
import type {
  FailedSaveIssue,
  InformedOfIssueChange,
  SucceededSaveIssue,
} from './message'
import { type Model, SaveState } from './model'
import { OutMessage } from './outMessage'
import { editDraft } from './steps'

const resetDraftFields = (model: Model) => {
  const nextBaseline = latestRevision(model)

  return {
    baseline: () => nextBaseline,
    draft: () => nextBaseline.fields,
    maybeIncomingRevision: () => Option.none(),
    saveState: () => SaveState.Idle(),
  }
}

const resetDraft = makeStep(model => {
  if (SaveState.guards.Saving(model.saveState)) {
    return { model }
  }

  return { model: modifyFields(model, resetDraftFields(model)) }
})

const saveIssue = makeStep(model => {
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
  model: Model,
  { issue }: InformedOfIssueChange,
) => ({ model: reconcileIssue(model, issue) })

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
  { savedIssue, expectedVersion }: SucceededSaveIssue,
) => {
  if (!isCurrentSave(model, savedIssue.issueId, expectedVersion)) {
    return { model }
  }

  const savedRevision = savedIssue.revision
  const latestKnownRevision = latestRevision(model)

  const nextBaseline =
    latestKnownRevision.version > savedRevision.version
      ? latestKnownRevision
      : savedRevision

  return {
    model: modifyFields(model, {
      baseline: () => nextBaseline,
      draft: () => nextBaseline.fields,
      maybeIncomingRevision: () => Option.none(),
      saveState: () => SaveState.Idle(),
    }),
    outMessage: OutMessage.Saved({ savedIssue }),
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
      Conflict: ({ latestIssue }) => {
        const reconciledModel = reconcileIssue(model, latestIssue)

        return {
          model: modifyFields(reconciledModel, {
            saveState: () => SaveState.Failed({ error: error.message }),
          }),
          outMessage: OutMessage.ReceivedIssue({ issue: latestIssue }),
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
    editDraft(draft => modifyFields(draft, { title: () => value }))(model),
  UpdatedDescription: (model, { value }) =>
    editDraft(draft => modifyFields(draft, { description: () => value }))(
      model,
    ),
  SubmittedIssueForm: saveIssue,
  ClickedRetrySave: saveIssue,
  RequestedSave: saveIssue,
  InformedOfIssueChange: handleInformedOfIssueChange,
  ClickedReloadIssue: resetDraft,
  ClickedDiscardChanges: resetDraft,
  ClickedClose: makeOutMessageStep(() => OutMessage.Closed()),
  SucceededSaveIssue: handleSucceededSaveIssue,
  FailedSaveIssue: handleFailedSaveIssue,
})
