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
  requestMoveIssueStep,
} from '../composition'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from '../definition'
import { simulateActivityStep } from '../demoActivity'
import { NotificationActivity, type WorkspaceSnapshot } from '../domain'
import { IssueMoveState, WorkspaceAsyncData } from '../model'
import { RepositoryError } from '../repository'
import { handleChangedUrlStep } from './handleChangedUrl'
import { handleClickedDeleteSavedView } from './handleClickedDeleteSavedView'
import { initializeActiveChildrenStep } from './initializeActiveChildren'
import {
  applyIncomingIssueStep,
  reconcileRetainedIssueDetailsStep,
} from './issueDetails'
import {
  applyMovedIssuesStep,
  informBoardMoveFailureStep,
  mergeIssues,
  rollbackMoveStep,
} from './issueMove'

const applySnapshotStep = (snapshot: typeof WorkspaceSnapshot.Type) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: workspaceAsyncData =>
      WorkspaceAsyncData.Success({
        data: Option.match(AsyncData.getData(workspaceAsyncData), {
          onNone: () => snapshot,
          onSome: current =>
            modifyFields(snapshot, {
              issues: incomingIssues =>
                mergeIssues(current.issues, incomingIssues),
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
  SucceededLoadWorkspace: (model, { snapshot }) =>
    Update.combineSteps(model, [
      applySnapshotStep(snapshot),
      initializeActiveChildrenStep,
      reconcileRetainedIssueDetailsStep,
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
  SucceededAppendActivity: (model, { issue }) =>
    Update.combineSteps(model, [
      applyIncomingIssueStep(issue),
      makeFieldsStep(() => ({
        maybeActivityError: () => Option.none(),
      })),
    ]),
  SucceededAssignIssue: (model, { issue, actorId, createdAt }) => {
    const isNewerAssignment = pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(snapshot =>
        Array.findFirst(snapshot.issues, previous => previous.id === issue.id),
      ),
      Option.exists(
        previous =>
          issue.version > previous.version &&
          Option.exists(
            issue.maybeAssigneeId,
            recipientId =>
              !Option.contains(previous.maybeAssigneeId, recipientId),
          ),
      ),
    )

    return Update.combineSteps(model, [
      applyIncomingIssueStep(issue),
      makeFieldsStep(() => ({
        maybeActivityError: () => Option.none(),
      })),
      isNewerAssignment
        ? NotificationCenterBinding.informActivity({
            activity: NotificationActivity.Assigned({
              issue,
              actorId,
              createdAt,
            }),
          })
        : makeNoopStep(),
    ])
  },
  FailedAssignIssue: makeFieldsStep.fromMessage(({ error }) => ({
    maybeActivityError: () => Option.some(error),
  })),
  FailedAppendActivity: makeFieldsStep.fromMessage(({ error }) => ({
    maybeActivityError: () => Option.some(error),
  })),
  SucceededMoveIssue: (model, { snapshot }) =>
    Update.combineSteps(model, [
      applyMovedIssuesStep(snapshot),
      makeFieldsStep(() => ({
        issueMoveState: () => IssueMoveState.Idle(),
        maybeNotice: () => Option.some('Issue moved'),
      })),
      reconcileRetainedIssueDetailsStep,
    ]),
  FailedMoveIssue: (model, { issueId, status, insertionIndex, error }) => {
    const failedMoveStep = makeFieldsStep(() => ({
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
          rollbackMoveStep(issueId),
          failedMoveStep,
          applyIncomingIssueStep(error.latestIssue),
          informBoardMoveFailureStep(issueId),
        ])
      : Update.combineSteps(model, [
          rollbackMoveStep(issueId),
          failedMoveStep,
          informBoardMoveFailureStep(issueId),
        ])
  },
  ClickedRetryMove: model =>
    IssueMoveState.match(model.issueMoveState, {
      Idle: () => noopStep(model),
      MovingIssue: () => noopStep(model),
      FailedMove: ({ issueId, status, insertionIndex }) =>
        requestMoveIssueStep(issueId, status, insertionIndex)(model),
    }),
})
