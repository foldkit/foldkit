import { Array, Option, Result } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './block'
import {
  FailNextIssueSave,
  LoadExternal,
  LoadWorkspace,
  NavigateInternal,
  ReplaceInternalUrl,
} from './command'
import { ApplicationComposition, CommandPaletteBinding } from './composition'
import { simulateTeammateActivity } from './demoActivity'
import { Issue, type Workspace } from './domain'
import type { ChangedUrl, ClickedDeleteSavedView } from './message'
import { type Model, WorkspaceAsyncData } from './model'
import {
  ApplicationRoute,
  maybeIssueId,
  routeToPath,
  urlToApplicationRoute,
} from './route'
import { effectiveIssueFilters } from './selectors'
import {
  handleFailedMoveIssue,
  handleSucceededAssignIssue,
  handleSucceededMoveIssue,
  initRouteChildren,
  recordIssueComment,
  retryIssueMove,
} from './steps'

const handleChangedUrl = makeStep.fromMessage(({ url }: ChangedUrl) =>
  Update.combineSteps([
    makeFieldsStep(() => ({
      route: () => urlToApplicationRoute(url),
      maybeNotice: () => Option.none(),
    })),
    initRouteChildren,
  ]),
)

const handleClickedDeleteSavedView = (
  model: Model,
  { viewId }: ClickedDeleteSavedView,
) => {
  const { route } = model

  const isDeletingDisplayedView =
    ApplicationRoute.guards.SavedView(route) && route.viewId === viewId

  const nextSavedViews = Array.filter(
    model.savedViews,
    savedView => savedView.id !== viewId,
  )

  if (!isDeletingDisplayedView) {
    return {
      model: modifyFields(model, { savedViews: () => nextSavedViews }),
    }
  }

  const issuesRoute = ApplicationRoute.Issues({
    filters: effectiveIssueFilters(model),
  })
  const maybeSelectedIssueId = maybeIssueId(model.route)

  if (Option.isNone(maybeSelectedIssueId)) {
    return {
      model: modifyFields(model, { savedViews: () => nextSavedViews }),
      commands: [NavigateInternal({ url: routeToPath(issuesRoute) })],
    }
  }

  const nextRoute = ApplicationRoute.Issues({
    filters: effectiveIssueFilters(model),
    issueId: maybeSelectedIssueId.value,
  })

  return {
    model: modifyFields(model, {
      route: () => nextRoute,
      savedViews: () => nextSavedViews,
    }),
    commands: [ReplaceInternalUrl({ url: routeToPath(nextRoute) })],
  }
}

const mergeWorkspaceSnapshot = (incomingWorkspace: Workspace.Workspace) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: workspaceAsyncData =>
      WorkspaceAsyncData.Success({
        data: Option.match(AsyncData.getData(workspaceAsyncData), {
          onNone: () => incomingWorkspace,
          onSome: currentWorkspace =>
            modifyFields(incomingWorkspace, {
              issues: incomingIssues =>
                Issue.mergeAll(currentWorkspace.issues, incomingIssues),
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
      mergeWorkspaceSnapshot(workspace),
      initRouteChildren,
    ]),
  FailedLoadWorkspace: makeFieldsStep.fromMessage(({ error }) => ({
    workspaceAsyncData: workspaceAsyncData =>
      AsyncData.settle(workspaceAsyncData, Result.fail(error)),
  })),
  ClickedRetryLoad: handleClickedRetryLoad,
  ClickedSimulateSaveFailure: makeCommandsStep(() => [FailNextIssueSave()]),
  CompletedFailNextIssueSave: makeFieldsStep(() => ({
    maybeNotice: () =>
      Option.some(
        'The next save will fail. Your draft will be kept so you can retry.',
      ),
  })),
  ClickedOpenCommandPalette: CommandPaletteBinding.requestOpen(),
  ClickedDeleteSavedView: handleClickedDeleteSavedView,
  TickedActivityStream: simulateTeammateActivity,
  ClickedSimulateActivity: simulateTeammateActivity,
  SucceededAddIssueComment: (model, { issueId, comment }) =>
    Update.combineSteps(model, [
      recordIssueComment(issueId, comment),
      makeFieldsStep(() => ({
        maybeActivityError: () => Option.none(),
      })),
    ]),
  SucceededAssignIssue: handleSucceededAssignIssue,
  FailedAssignIssue: makeFieldsStep.fromMessage(({ error }) => ({
    maybeActivityError: () => Option.some(error),
  })),
  FailedAddIssueComment: makeFieldsStep.fromMessage(({ error }) => ({
    maybeActivityError: () => Option.some(error),
  })),
  SucceededMoveIssue: handleSucceededMoveIssue,
  FailedMoveIssue: handleFailedMoveIssue,
  ClickedRetryMove: retryIssueMove,
})
