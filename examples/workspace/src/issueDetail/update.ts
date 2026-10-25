import { Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { RepositoryError } from '../repository'
import { SaveIssue } from './command'
import {
  CommentComposerBinding,
  IssueDetailComposition,
  changeDraft,
} from './composition'
import {
  IssueDetailDefinition,
  Message,
  type Model,
  OutMessage,
  SaveState,
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

const keepModel = IssueDetailDefinition.makeNoopStep()

const reportDraft = CommentComposerBinding.requestReportDraft()

const resetDraft = (model: Parameters<typeof reportDraft>[0]) => {
  if (SaveState.guards.Saving(model.saveState)) {
    return keepModel(model)
  }

  return reportDraft(modifyFields(model, resetDraftFields(model)))
}

const saveIssue = IssueDetailDefinition.makeStep(model => {
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
) => {
  const reconciled = reconcileIssue(model, issue)

  if (reconciled === model) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      baseline: () => reconciled.baseline,
      draft: () => reconciled.draft,
      maybeIncomingRevision: () => reconciled.maybeIncomingRevision,
      saveState: () => reconciled.saveState,
    }),
  }
}

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
          model: modifyFields(model, {
            baseline: () => reconciled.baseline,
            draft: () => reconciled.draft,
            maybeIncomingRevision: () => reconciled.maybeIncomingRevision,
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
    changeDraft(draft => modifyFields(draft, { title: () => value }))(model),
  UpdatedDescription: (model, { value }) =>
    changeDraft(draft => modifyFields(draft, { description: () => value }))(
      model,
    ),
  SubmittedIssueForm: saveIssue,
  ClickedRetrySave: saveIssue,
  RequestedSave: saveIssue,
  RequestedReportDraft: reportDraft,
  InformedOfIssueChange: handleInformedOfIssueChange,
  ClickedReloadIssue: model =>
    Option.match(model.maybeIncomingRevision, {
      onNone: () => keepModel(model),
      onSome: () => resetDraft(model),
    }),
  ClickedDiscardChanges: resetDraft,
  ClickedClose: IssueDetailDefinition.makeOutMessageStep(() =>
    OutMessage.Closed(),
  ),
  SucceededSaveIssue: handleSucceededSaveIssue,
  FailedSaveIssue: handleFailedSaveIssue,
})
