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
} from '../composition'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from '../definition'
import { simulateActivity } from '../demoActivity'
import { NotificationActivity, type Workspace, mergeIssues } from '../domain'
import { WorkspaceAsyncData } from '../model'
import { IssueMoveState } from '../optimistic'
import { RepositoryError } from '../repository'
import { applyIssueComment, requestIssueMove } from '../steps'
import { handleChangedUrl } from './handleChangedUrl'
import { handleClickedDeleteSavedView } from './handleClickedDeleteSavedView'
import { initChildren } from './initChildren'
import {
  informIssueChanged,
  informRetainedIssueDetails,
  receiveIssueSnapshot,
  receiveSavedIssue,
} from './issueDetails'
import { applyMovedIssue, informBoardMoveFailure } from './issueMove'

const applyWorkspaceSnapshot = (nextWorkspace: Workspace) =>
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

const keepModel = makeNoopStep()

const handleClickedRetryLoad = makeStep(model =>
  Option.match(AsyncData.revalidateOrLoad(model.workspaceAsyncData), {
    onNone: () => keepModel(model),
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
  ChangedUrl: handleChangedUrl,
  CompletedNavigateInternal: keepModel,
  CompletedLoadExternal: keepModel,
  CompletedReplaceInternalUrl: keepModel,
  SucceededLoadWorkspace: (model, { workspace }) =>
    Update.combineSteps(model, [
      applyWorkspaceSnapshot(workspace),
      initChildren,
      informRetainedIssueDetails,
    ]),
  FailedLoadWorkspace: makeFieldsStep.fromMessage(({ error }) => ({
    workspaceAsyncData: workspaceAsyncData =>
      AsyncData.settle(workspaceAsyncData, Result.fail(error)),
  })),
  ClickedRetryLoad: handleClickedRetryLoad,
  ClickedSimulateSaveFailure: makeCommandsStep(() => [SimulateSaveFailure()]),
  CompletedSimulateSaveFailure: makeFieldsStep(() => ({
    maybeNotice: () =>
      Option.some(
        'The next save will fail. Your draft will be kept so you can retry.',
      ),
  })),
  ClickedOpenCommandPalette: CommandPaletteBinding.requestOpen(),
  ClickedDeleteSavedView: handleClickedDeleteSavedView,
  TickedActivityStream: simulateActivity,
  ClickedSimulateActivity: simulateActivity,
  SucceededAppendActivity: (model, { issueId, comment }) =>
    Update.combineSteps(model, [
      applyIssueComment(issueId, comment),
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
      receiveSavedIssue(savedIssue),
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
      applyMovedIssue(movedIssue),
      makeFieldsStep(() => ({
        issueMoveState: () => IssueMoveState.Idle(),
        maybeNotice: () => Option.some('Issue moved'),
      })),
      informIssueChanged(movedIssue.issueId),
    ]),
  FailedMoveIssue: (model, { issueId, status, insertionIndex, error }) => {
    const failIssueMove = makeFieldsStep(() => ({
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
          failIssueMove,
          receiveIssueSnapshot(error.latestIssue),
          informBoardMoveFailure(issueId),
        ])
      : Update.combineSteps(model, [
          failIssueMove,
          informBoardMoveFailure(issueId),
        ])
  },
  ClickedRetryMove: model =>
    IssueMoveState.match(model.issueMoveState, {
      Idle: () => keepModel(model),
      MovingIssue: () => keepModel(model),
      FailedMove: ({ issueId, status, insertionIndex }) =>
        requestIssueMove(issueId, status, insertionIndex)(model),
    }),
})
