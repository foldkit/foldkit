import { Array, Option, Result } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  LoadExternal,
  LoadWorkspace,
  NavigateInternal,
  SimulateSaveFailure,
} from './command'
import {
  ApplicationComposition,
  CommandPaletteBinding,
  IssueBoardBinding,
  IssueDetailBinding,
  NotificationCenterBinding,
  ProjectSettingsBinding,
  applyObservedIssue,
  requestMoveIssue,
} from './composition'
import { ApplicationDefinition } from './definition'
import { simulateActivity } from './demoActivity'
import {
  type Issue,
  NotificationActivity,
  type WorkspaceSnapshot,
  mergeIssue,
  placeIssueAt,
} from './domain'
import { Message } from './message'
import { IssueMoveState, type Model, WorkspaceAsyncData } from './model'
import { appliedIssueFilters, backgroundRoute } from './navigation'
import { RepositoryError } from './repository'
import {
  ApplicationRoute,
  resolveIssueCloseRoute,
  routeToPath,
  urlToApplicationRoute,
} from './route'

const syncIssuePanel = ApplicationDefinition.makeStep(model => {
  if (!ApplicationRoute.guards.Issue(model.route)) {
    return {
      model: modifyFields(model, {
        maybeIssueDetailInstance: () => Option.none(),
      }),
    }
  }

  const {
    route: { issueId },
  } = model

  if (
    Option.exists(
      model.maybeIssueDetailInstance,
      instance => instance.issueId === issueId,
    )
  ) {
    return { model }
  }

  const maybeIssue = Option.match(AsyncData.getData(model.workspaceAsyncData), {
    onNone: () => Option.none(),
    onSome: snapshot =>
      Array.findFirst(snapshot.issues, issue => issue.id === issueId),
  })

  return Option.match(maybeIssue, {
    onNone: () => ({
      model: modifyFields(model, {
        maybeIssueDetailInstance: () => Option.none(),
      }),
    }),
    onSome: issue =>
      IssueDetailBinding.init({
        key: issueId,
        args: [
          issue,
          Array.findFirst(
            model.issueDrafts,
            draft => draft.issueId === issueId,
          ),
        ],
        toParentModel: child =>
          modifyFields(model, {
            maybeIssueDetailInstance: () =>
              Option.some({ issueId, model: child }),
          }),
      }),
  })
})

const syncProjectBoard = ApplicationDefinition.makeStep(model => {
  const route = backgroundRoute(model)

  const maybeProject = Option.match(
    AsyncData.getData(model.workspaceAsyncData),
    {
      onNone: () => Option.none(),
      onSome: snapshot =>
        ApplicationRoute.guards.Board(route)
          ? Array.findFirst(
              snapshot.projects,
              project => project.id === route.projectId,
            )
          : Option.none(),
    },
  )

  return Option.match(maybeProject, {
    onNone: () => ({
      model: modifyFields(model, { maybeBoardInstance: () => Option.none() }),
    }),
    onSome: project => {
      if (
        Option.exists(
          model.maybeBoardInstance,
          instance => instance.projectId === project.id,
        )
      ) {
        return { model }
      }

      return IssueBoardBinding.init({
        key: project.id,
        args: [],
        toParentModel: board =>
          modifyFields(model, {
            maybeBoardInstance: () =>
              Option.some({ projectId: project.id, model: board }),
          }),
      })
    },
  })
})

const syncProjectSettings = ApplicationDefinition.makeStep(model => {
  const route = backgroundRoute(model)

  if (
    !ApplicationRoute.guards.ProjectSettings(route) ||
    Array.some(
      model.projectSettingsInstances,
      instance => instance.projectId === route.projectId,
    )
  ) {
    return { model }
  }

  return Option.match(
    Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
      Array.findFirst(
        snapshot.projects,
        project => project.id === route.projectId,
      ),
    ),
    {
      onNone: () => ({ model }),
      onSome: project =>
        ProjectSettingsBinding.init({
          key: project.id,
          args: [project],
          toParentModel: settings =>
            modifyFields(model, {
              projectSettingsInstances: Array.append({
                projectId: project.id,
                model: settings,
              }),
            }),
        }),
    },
  )
})

const observeIssue = (issue: typeof Issue.Type) =>
  ApplicationDefinition.makeStep(model => {
    const isNewFieldRevision = Option.exists(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
        Array.findFirst(snapshot.issues, current => current.id === issue.id),
      ),
      current => issue.version > current.version,
    )

    if (isNewFieldRevision) {
      return Update.combineSteps([
        applyObservedIssue(issue),
        IssueDetailBinding.informIssueChanged(issue.id, { issue }),
        IssueDetailBinding.requestReportDraft(issue.id),
      ])
    }

    return applyObservedIssue(issue)
  })

const mergeIssues = (
  current: ReadonlyArray<typeof Issue.Type>,
  incoming: ReadonlyArray<typeof Issue.Type>,
) => [
  ...Array.map(incoming, issue =>
    Option.match(
      Array.findFirst(current, previous => previous.id === issue.id),
      {
        onNone: () => issue,
        onSome: previous => mergeIssue(previous, issue),
      },
    ),
  ),
  ...Array.filter(
    current,
    issue =>
      !Array.some(incoming, incomingIssue => incomingIssue.id === issue.id),
  ),
]

const applyMovedIssues = (snapshot: typeof WorkspaceSnapshot.Type) =>
  ApplicationDefinition.makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(current =>
      modifyFields(current, {
        issues: issues => mergeIssues(issues, snapshot.issues),
      }),
    ),
  }))

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

const informOpenIssue = ApplicationDefinition.makeStep(model => {
  const maybeSnapshot = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeSnapshot)) {
    return { model }
  }

  const issues = maybeSnapshot.value.issues

  return Option.match(
    Option.flatMap(model.maybeIssueDetailInstance, instance =>
      Array.findFirst(issues, issue => issue.id === instance.issueId),
    ),
    {
      onNone: () => ({ model }),
      onSome: issue =>
        Update.combineSteps([
          IssueDetailBinding.informIssueChanged(issue.id, { issue }),
          IssueDetailBinding.requestReportDraft(issue.id),
        ]),
    },
  )
})

const rollbackMove = (issueId: string) =>
  ApplicationDefinition.makeFieldsStep(model => ({
    workspaceAsyncData: workspaceAsyncData => {
      if (
        !IssueMoveState.guards.MovingIssue(model.issueMoveState) ||
        model.issueMoveState.issueId !== issueId
      ) {
        return workspaceAsyncData
      }

      const { previousStatus, previousIndex, expectedVersion } =
        model.issueMoveState

      return AsyncData.map(workspaceAsyncData, snapshot =>
        modifyFields(snapshot, {
          issues: issues =>
            Option.match(
              Array.findFirst(issues, issue => issue.id === issueId),
              {
                onNone: () => issues,
                onSome: issue =>
                  placeIssueAt(
                    issues,
                    issue.version > expectedVersion
                      ? issue
                      : modifyFields(issue, { status: () => previousStatus }),
                    previousIndex,
                  ),
              },
            ),
        }),
      )
    },
  }))

const informBoardMoveFailure = (issueId: string) =>
  ApplicationDefinition.makeStep(model =>
    Option.match(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
        Array.findFirst(snapshot.issues, issue => issue.id === issueId),
      ),
      {
        onNone: () => ({ model }),
        onSome: issue =>
          IssueBoardBinding.informIssueMoveFailed(issue.projectId),
      },
    ),
  )

const noop = ApplicationDefinition.makeNoopStep()

const navigateInternal = (url: string) =>
  ApplicationDefinition.makeCommandsStep(() => [NavigateInternal({ url })])

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

const handleClickedDeleteSavedView = (
  model: typeof Model.Type,
  { viewId }: typeof Message.ClickedDeleteSavedView.Type,
) => {
  const currentPageRoute = backgroundRoute(model)
  const isDeletingCurrentView =
    ApplicationRoute.guards.SavedView(currentPageRoute) &&
    currentPageRoute.viewId === viewId

  const nextIssueCloseRoute = ApplicationRoute.Issues({
    filters: appliedIssueFilters(model),
  })

  const deletedModel = modifyFields(model, {
    savedViews: Array.filter(saved => saved.id !== viewId),
    issueCloseRoute: previous =>
      isDeletingCurrentView ? nextIssueCloseRoute : previous,
  })

  return isDeletingCurrentView
    ? {
        model: deletedModel,
        commands: [
          NavigateInternal({
            url: routeToPath(nextIssueCloseRoute),
          }),
        ],
      }
    : { model: deletedModel }
}

export const update = ApplicationComposition.makeUpdate({
  ClickedLink: (model, { request }) =>
    UrlRequest.match(request, {
      Internal: ({ url }) => navigateInternal(urlToString(url))(model),
      External: ({ href }) =>
        ApplicationDefinition.makeCommandsStep(() => [LoadExternal({ href })])(
          model,
        ),
    }),
  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)

    return Update.combineSteps(model, [
      ApplicationDefinition.makeFieldsStep(() => ({
        route: () => nextRoute,
        issueCloseRoute: previous =>
          resolveIssueCloseRoute(nextRoute, previous),
        maybeNotice: () => Option.none(),
      })),
      syncProjectSettings,
      syncIssuePanel,
      syncProjectBoard,
    ])
  },
  CompletedNavigateInternal: noop,
  CompletedLoadExternal: noop,
  CompletedReplaceFilters: noop,
  SucceededLoadWorkspace: (model, { snapshot }) =>
    Update.combineSteps(model, [
      applySnapshot(snapshot),
      syncProjectSettings,
      syncIssuePanel,
      informOpenIssue,
      syncProjectBoard,
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
      observeIssue(issue),
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeActivityError: () => Option.none(),
      })),
    ]),
  SucceededAssignIssue: (model, { issue, actorId, createdAt }) => {
    const isNewerAssignment = Option.exists(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
        Array.findFirst(snapshot.issues, previous => previous.id === issue.id),
      ),
      previous =>
        issue.version > previous.version &&
        Option.exists(
          issue.maybeAssigneeId,
          recipientId =>
            !Option.contains(previous.maybeAssigneeId, recipientId),
        ),
    )

    return Update.combineSteps(model, [
      observeIssue(issue),
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
      informOpenIssue,
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
          observeIssue(error.latestIssue),
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
