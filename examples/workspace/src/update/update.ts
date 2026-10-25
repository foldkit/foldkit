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
  requestMoveIssue,
} from '../composition'
import { ApplicationDefinition } from '../definition'
import { simulateActivity } from '../demoActivity'
import { NotificationActivity, type WorkspaceSnapshot } from '../domain'
import { IssueMoveState, WorkspaceAsyncData } from '../model'
import { RepositoryError } from '../repository'
import { handleChangedUrl } from './handleChangedUrl'
import { handleClickedDeleteSavedView } from './handleClickedDeleteSavedView'
import { initializeActiveChildren } from './initializeActiveChildren'
import {
  applyIncomingIssue,
  reconcileRetainedIssueDetails,
} from './issueDetails'
import {
  applyMovedIssues,
  informBoardMoveFailure,
  mergeIssues,
  rollbackMove,
} from './issueMove'

const applySnapshot = (snapshot: typeof WorkspaceSnapshot.Type) =>
  ApplicationDefinition.makeFieldsStep(() => ({
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

const noop = ApplicationDefinition.makeNoopStep()

const handleClickedRetryLoad = ApplicationDefinition.makeStep(model =>
  Option.match(AsyncData.revalidateOrLoad(model.workspaceAsyncData), {
    onNone: () => noop(model),
    onSome: workspaceAsyncData => ({
      model: modifyFields(model, {
        workspaceAsyncData: () => workspaceAsyncData,
      }),
      commands: [LoadWorkspace()],
    }),
  }),
)

export const update = ApplicationComposition.makeUpdate({
  ClickedLink: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ request }) =>
      UrlRequest.match(request, {
        Internal: ({ url }) => [NavigateInternal({ url: urlToString(url) })],
        External: ({ href }) => [LoadExternal({ href })],
      }),
  ),
  ChangedUrl: handleChangedUrl,
  CompletedNavigateInternal: noop,
  CompletedLoadExternal: noop,
  CompletedReplaceInternalUrl: noop,
  SucceededLoadWorkspace: (model, { snapshot }) =>
    Update.combineSteps(model, [
      applySnapshot(snapshot),
      initializeActiveChildren,
      reconcileRetainedIssueDetails,
    ]),
  FailedLoadWorkspace: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      workspaceAsyncData: workspaceAsyncData =>
        AsyncData.settle(workspaceAsyncData, Result.fail(error)),
    }),
  ),
  ClickedRetryLoad: handleClickedRetryLoad,
  ClickedSimulateSaveFailure: ApplicationDefinition.makeCommandsStep(() => [
    SimulateSaveFailure(),
  ]),
  CompletedSimulateSaveFailure: ApplicationDefinition.makeFieldsStep(() => ({
    maybeNotice: () =>
      Option.some(
        'The next save will fail. Your draft will be kept so you can retry.',
      ),
  })),
  ClickedOpenCommandPalette: CommandPaletteBinding.requestOpen(),
  ClickedDeleteSavedView: handleClickedDeleteSavedView,
  TickedActivityStream: simulateActivity,
  ClickedSimulateActivity: simulateActivity,
  SucceededAppendActivity: (model, { issue }) =>
    Update.combineSteps(model, [
      applyIncomingIssue(issue),
      ApplicationDefinition.makeFieldsStep(() => ({
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
      applyIncomingIssue(issue),
      ApplicationDefinition.makeFieldsStep(() => ({
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
        : ApplicationDefinition.makeNoopStep(),
    ])
  },
  FailedAssignIssue: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      maybeActivityError: () => Option.some(error),
    }),
  ),
  FailedAppendActivity: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      maybeActivityError: () => Option.some(error),
    }),
  ),
  SucceededMoveIssue: (model, { snapshot }) =>
    Update.combineSteps(model, [
      applyMovedIssues(snapshot),
      ApplicationDefinition.makeFieldsStep(() => ({
        issueMoveState: () => IssueMoveState.Idle(),
        maybeNotice: () => Option.some('Issue moved'),
      })),
      reconcileRetainedIssueDetails,
    ]),
  FailedMoveIssue: (model, { issueId, status, insertionIndex, error }) => {
    const failedMove = ApplicationDefinition.makeFieldsStep(() => ({
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
          rollbackMove(issueId),
          failedMove,
          applyIncomingIssue(error.latestIssue),
          informBoardMoveFailure(issueId),
        ])
      : Update.combineSteps(model, [
          rollbackMove(issueId),
          failedMove,
          informBoardMoveFailure(issueId),
        ])
  },
  ClickedRetryMove: model =>
    IssueMoveState.match(model.issueMoveState, {
      Idle: () => noop(model),
      MovingIssue: () => noop(model),
      FailedMove: ({ issueId, status, insertionIndex }) =>
        requestMoveIssue(issueId, status, insertionIndex)(model),
    }),
})
