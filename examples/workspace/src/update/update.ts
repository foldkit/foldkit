import { Array, Option, Result, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  LoadExternal,
  LoadWorkspace,
  NavigateInternal,
  SimulateSaveFailure,
} from '../command'
import {
  ApplicationComposition,
  CommandPaletteBinding,
  NotificationCenterBinding,
  applyIssueCommentStep,
  requestIssueMoveStep,
} from '../composition'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from '../definition'
import { simulateActivityStep } from '../demoActivity'
import { NotificationActivity, type Workspace, mergeIssues } from '../domain'
import { WorkspaceAsyncData } from '../model'
import { IssueMoveState } from '../optimistic'
import { RepositoryError } from '../repository'
import { handleChangedUrlStep } from './handleChangedUrl'
import { handleClickedDeleteSavedView } from './handleClickedDeleteSavedView'
import { initChildrenStep } from './initChildrenStep'
import {
  informIssueChangedStep,
  informRetainedIssueDetailsStep,
  receiveIssueSnapshotStep,
  receiveSavedIssueStep,
} from './issueDetails'
import { applyMovedIssueStep, informBoardMoveFailureStep } from './issueMove'

const applyWorkspaceSnapshotStep = (nextWorkspace: typeof Workspace.Type) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: workspaceAsyncData =>
      WorkspaceAsyncData.Success({
        data: Option.match(AsyncData.getData(workspaceAsyncData), {
          onNone: () => nextWorkspace,
          onSome: currentWorkspace =>
            modifyFields(nextWorkspace, {
              issues: incomingIssues =>
                mergeIssues(currentWorkspace.issues, incomingIssues),
            }),
        }),
      }),
  }))

const noopStep = makeNoopStep()

const handleClickedRetryLoadStep = makeStep(model =>
  Option.match(AsyncData.revalidateOrLoad(model.workspaceAsyncData), {
    onNone: () => noopStep(model),
    onSome: workspaceAsyncData => ({
      model: modifyFields(model, {
        workspaceAsyncData: () => workspaceAsyncData,
      }),
      commands: [LoadWorkspace()],
    }),
  }),
)

export const update = ApplicationComposition.makeUpdate({
  ClickedLink: makeCommandsStep.fromMessage(({ request }) =>
    UrlRequest.match(request, {
      Internal: ({ url }) => [NavigateInternal({ url: urlToString(url) })],
      External: ({ href }) => [LoadExternal({ href })],
    }),
  ),
  ChangedUrl: handleChangedUrlStep,
  CompletedNavigateInternal: noopStep,
  CompletedLoadExternal: noopStep,
  CompletedReplaceInternalUrl: noopStep,
  SucceededLoadWorkspace: (model, { workspace }) =>
    Update.combineSteps(model, [
      applyWorkspaceSnapshotStep(workspace),
      initChildrenStep,
      informRetainedIssueDetailsStep,
    ]),
  FailedLoadWorkspace: makeFieldsStep.fromMessage(({ error }) => ({
    workspaceAsyncData: workspaceAsyncData =>
      AsyncData.settle(workspaceAsyncData, Result.fail(error)),
  })),
  ClickedRetryLoad: handleClickedRetryLoadStep,
  ClickedSimulateSaveFailure: makeCommandsStep(() => [SimulateSaveFailure()]),
  CompletedSimulateSaveFailure: makeFieldsStep(() => ({
    maybeNotice: () =>
      Option.some(
        'The next save will fail. Your draft will be kept so you can retry.',
      ),
  })),
  ClickedOpenCommandPalette: CommandPaletteBinding.requestOpen(),
  ClickedDeleteSavedView: handleClickedDeleteSavedView,
  TickedActivityStream: simulateActivityStep,
  ClickedSimulateActivity: simulateActivityStep,
  SucceededAppendActivity: (model, { issueId, comment }) =>
    Update.combineSteps(model, [
      applyIssueCommentStep(issueId, comment),
      makeFieldsStep(() => ({
        maybeActivityError: () => Option.none(),
      })),
    ]),
  SucceededAssignIssue: (model, { savedIssue, actorId, createdAt }) => {
    const isNewAssignment = pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(workspace =>
        Array.findFirst(
          workspace.issues,
          previousIssue => previousIssue.id === savedIssue.issueId,
        ),
      ),
      Option.exists(
        previousIssue =>
          savedIssue.revision.version > previousIssue.version &&
          Option.exists(
            savedIssue.revision.fields.maybeAssigneeId,
            recipientId =>
              !Option.contains(previousIssue.maybeAssigneeId, recipientId),
          ),
      ),
    )

    return Update.combineSteps(model, [
      receiveSavedIssueStep(savedIssue),
      makeFieldsStep(() => ({
        maybeActivityError: () => Option.none(),
      })),
      isNewAssignment
        ? makeStep(stepModel =>
            Option.match(
              Option.flatMap(
                AsyncData.getData(stepModel.workspaceAsyncData),
                workspace =>
                  Array.findFirst(
                    workspace.issues,
                    issue => issue.id === savedIssue.issueId,
                  ),
              ),
              {
                onNone: () => ({ model: stepModel }),
                onSome: issue =>
                  NotificationCenterBinding.informActivity({
                    activity: NotificationActivity.Assigned({
                      issue,
                      actorId,
                      createdAt,
                    }),
                  }),
              },
            ),
          )
        : makeNoopStep(),
    ])
  },
  FailedAssignIssue: makeFieldsStep.fromMessage(({ error }) => ({
    maybeActivityError: () => Option.some(error),
  })),
  FailedAppendActivity: makeFieldsStep.fromMessage(({ error }) => ({
    maybeActivityError: () => Option.some(error),
  })),
  SucceededMoveIssue: (model, { movedIssue }) =>
    Update.combineSteps(model, [
      applyMovedIssueStep(movedIssue),
      makeFieldsStep(() => ({
        issueMoveState: () => IssueMoveState.Idle(),
        maybeNotice: () => Option.some('Issue moved'),
      })),
      informIssueChangedStep(movedIssue.issueId),
    ]),
  FailedMoveIssue: (model, { issueId, status, insertionIndex, error }) => {
    const failIssueMoveStep = makeFieldsStep(() => ({
      issueMoveState: () =>
        IssueMoveState.FailedMove({
          issueId,
          status,
          insertionIndex,
          error: error.message,
        }),
    }))

    return RepositoryError.guards.Conflict(error)
      ? Update.combineSteps(model, [
          failIssueMoveStep,
          receiveIssueSnapshotStep(error.latestIssue),
          informBoardMoveFailureStep(issueId),
        ])
      : Update.combineSteps(model, [
          failIssueMoveStep,
          informBoardMoveFailureStep(issueId),
        ])
  },
  ClickedRetryMove: model =>
    IssueMoveState.match(model.issueMoveState, {
      Idle: () => noopStep(model),
      MovingIssue: () => noopStep(model),
      FailedMove: ({ issueId, status, insertionIndex }) =>
        requestIssueMoveStep(issueId, status, insertionIndex)(model),
    }),
})
