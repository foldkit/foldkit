import {
  Array,
  Duration,
  Effect,
  Layer,
  Number,
  Option,
  Record,
  Result,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Block, Command } from 'foldkit'
import type { Send } from 'foldkit/block'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { combineSteps } from 'foldkit/update'
import { Url, toString as urlToString } from 'foldkit/url'

import { CommandPalette, CommandPaletteLive } from './commandPalette'
import { CreateIssue, CreateIssueLive } from './createIssue'
import {
  Comment,
  type Issue,
  type IssueFilters,
  type IssueStatus,
  type MovedIssue,
  NotificationActivity,
  type Project,
  SavedIssue,
  SavedView,
  Workspace,
} from './domain/domain'
import {
  applyComment,
  applyMovedIssue,
  applySavedIssue,
  mergeIssue,
  mergeIssues,
} from './domain/issue'
import { documentTitle } from './domain/pageTitle'
import { IssueBoard, IssueBoardLive } from './issueBoard'
import {
  IssuePane,
  IssuePaneLive,
  unsavedIssueDrafts,
} from './issueDetail/issuePane'
import { IssueList, IssueListLive } from './issueList'
import {
  IssueMove,
  IssueMoveLive,
  IssueMoveState,
  workspaceWithPendingMove,
} from './issueMove'
import { MemberDirectory, MemberDirectoryLive } from './memberDirectory'
import { MemberSwitcher, MemberSwitcherLive } from './memberSwitcher'
import {
  NotificationCenter,
  NotificationCenterLive,
} from './notificationCenter'
import { ProjectSettings, ProjectSettingsLive } from './projectSettings'
import {
  ApplicationRoute,
  appliedIssueFilters,
  isPageRoute,
  issueFiltersHref,
  issueHref,
  issueHrefs,
  issuesRouter,
  maybeIssueId,
  maybeProjectId,
  projectRouter,
  routeToPath,
  urlToApplicationRoute,
  withoutIssueId,
} from './route'
import { RepositoryError, WorkspaceRepository } from './services'
import { Sidebar, SidebarLive } from './sidebar'
import { TeammateActivity, TeammateActivityLive } from './teammateActivity'
import { WorkspacePage, WorkspacePageLive } from './workspacePage'
import { WorkspaceSettings, WorkspaceSettingsLive } from './workspaceSettings'

// MODEL

const WorkspaceAsyncData = AsyncData.Schema(Workspace, Schema.String)

export const Model = Schema.Struct({
  route: ApplicationRoute,
  workspaceAsyncData: WorkspaceAsyncData.schema,
  sidebar: Sidebar,
  workspacePage: WorkspacePage,
  memberSwitcher: MemberSwitcher,
  issueList: IssueList,
  createIssue: CreateIssue,
  issueBoards: Schema.Record(Schema.String, IssueBoard),
  issueMove: IssueMove,
  commandPalette: CommandPalette,
  memberDirectory: MemberDirectory,
  notificationCenter: NotificationCenter,
  workspaceSettings: WorkspaceSettings,
  teammateActivity: TeammateActivity,
  issuePane: IssuePane,
  maybeNotice: Schema.Option(Schema.String),
  savedViews: Schema.Array(SavedView),
  nextSavedViewId: Schema.Number,
  projectSettings: Schema.Record(Schema.String, ProjectSettings),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedReplaceInternalUrl: {},
  SucceededLoadWorkspace: { workspace: Workspace },
  FailedLoadWorkspace: { error: Schema.String },
  TickedActivityStream: {},
})
export type Message = typeof Message.Type

// COMMAND

export const LoadWorkspace = Command.define('LoadWorkspace', {
  messages: [Message.SucceededLoadWorkspace, Message.FailedLoadWorkspace],
})

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export const ReplaceInternalUrl = Command.define('ReplaceInternalUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceInternalUrl],
})

type ApplicationCommand =
  | ReturnType<typeof LoadWorkspace>
  | ReturnType<typeof NavigateInternal>
  | ReturnType<typeof LoadExternal>
  | ReturnType<typeof ReplaceInternalUrl>

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model,
    Message,
    Command: [
      LoadWorkspace,
      NavigateInternal,
      LoadExternal,
      ReplaceInternalUrl,
    ],
  },
) {}

type ApplicationStep = (model: Model) => Readonly<{
  model: Model
  commands?: ReadonlyArray<ApplicationCommand> | undefined
  messages?: ReadonlyArray<Send> | undefined
}>

type ApplicationViewBuilder = HtmlBuilder<Message, unknown>

const makeChildren = Effect.gen(function* () {
  return {
    sidebar: yield* new Sidebar('sidebar'),
    workspacePage: yield* new WorkspacePage('workspacePage'),
    memberSwitcher: yield* new MemberSwitcher('memberSwitcher'),
    issueList: yield* new IssueList('issueList'),
    createIssue: yield* new CreateIssue('createIssue'),
    issueMove: yield* new IssueMove('issueMove'),
    commandPalette: yield* new CommandPalette('commandPalette'),
    memberDirectory: yield* new MemberDirectory('memberDirectory'),
    notificationCenter: yield* new NotificationCenter('notificationCenter'),
    workspaceSettings: yield* new WorkspaceSettings('workspaceSettings'),
    teammateActivity: yield* new TeammateActivity('teammateActivity'),
    issuePane: yield* new IssuePane('issuePane'),
    issueBoard: yield* IssueBoard.each('issueBoards'),
    projectSettings: yield* ProjectSettings.each('projectSettings'),
  }
})
type Children = Effect.Success<typeof makeChildren>

// SELECTORS

const visibleWorkspaceAsyncData = (model: Model) =>
  AsyncData.map(model.workspaceAsyncData, workspace =>
    workspaceWithPendingMove(workspace, model.issueMove.model.state),
  )

const maybeVisibleWorkspace = (model: Model) =>
  AsyncData.getData(visibleWorkspaceAsyncData(model))

const activeMemberId = (model: Model) =>
  model.memberSwitcher.model.activeMemberId

const findIssue = (model: Model, issueId: string) =>
  Option.flatMap(AsyncData.getData(model.workspaceAsyncData), workspace =>
    Array.findFirst(workspace.issues, issue => issue.id === issueId),
  )

// ISSUE DATA

const updateWorkspaceStep =
  (transform: (workspace: Workspace) => Workspace): ApplicationStep =>
  model => ({
    model: modifyFields(model, {
      workspaceAsyncData: AsyncData.map(transform),
    }),
  })

const informActivity = (model: Model, activity: NotificationActivity) =>
  model.notificationCenter.send(
    NotificationCenter.Message.InformedOfActivity({ activity }),
  )

const notifyNewCommentsStep =
  (issue: Issue): ApplicationStep =>
  model => {
    const maybePreviousIssue = findIssue(model, issue.id)

    if (Option.isNone(maybePreviousIssue)) {
      return { model }
    }

    const newComments = Array.filter(
      issue.comments,
      comment =>
        !Array.some(
          maybePreviousIssue.value.comments,
          previousComment => previousComment.id === comment.id,
        ),
    )

    return {
      model,
      messages: Array.map(newComments, comment =>
        informActivity(
          model,
          NotificationActivity.Commented({ issue, comment }),
        ),
      ),
    }
  }

const applyIssueSnapshotStep =
  (issue: Issue): ApplicationStep =>
  model =>
    combineSteps(model, [
      notifyNewCommentsStep(issue),
      updateWorkspaceStep(workspace =>
        modifyFields(workspace, {
          issues: Array.map(currentIssue =>
            currentIssue.id === issue.id
              ? mergeIssue(currentIssue, issue)
              : currentIssue,
          ),
        }),
      ),
    ])

const applySavedIssueStep = (savedIssue: SavedIssue) =>
  updateWorkspaceStep(workspace => applySavedIssue(workspace, savedIssue))

const applyIssueCommentStep =
  (issueId: string, comment: Comment): ApplicationStep =>
  model => {
    const maybeIssue = findIssue(model, issueId)

    if (Option.isNone(maybeIssue)) {
      return { model }
    }

    const issue = maybeIssue.value
    const isNewComment = !Array.some(
      issue.comments,
      previousComment => previousComment.id === comment.id,
    )

    return {
      model: modifyFields(model, {
        workspaceAsyncData: AsyncData.map(workspace =>
          applyComment(workspace, issueId, comment),
        ),
      }),
      messages: Array.filter(
        [
          informActivity(
            model,
            NotificationActivity.Commented({ issue, comment }),
          ),
        ],
        () => isNewComment,
      ),
    }
  }

const applyWorkspaceSnapshotStep =
  (nextWorkspace: Workspace): ApplicationStep =>
  model => ({
    model: modifyFields(model, {
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
    }),
  })

const showNoticeStep =
  (notice: string): ApplicationStep =>
  model => ({
    model: modifyFields(model, { maybeNotice: () => Option.some(notice) }),
  })
// ISSUE DETAILS

const informIssueChangedStep =
  (issueId: string): ApplicationStep =>
  model => ({
    model,
    messages: Option.match(findIssue(model, issueId), {
      onNone: () => [],
      onSome: issue => [
        model.issuePane.send(
          IssuePane.Message.InformedOfIssueChange({ issue }),
        ),
      ],
    }),
  })

const receiveIssueSnapshotStep =
  (issue: Issue): ApplicationStep =>
  model =>
    combineSteps(model, [
      applyIssueSnapshotStep(issue),
      informIssueChangedStep(issue.id),
    ])

const receiveSavedIssueStep =
  (savedIssue: SavedIssue): ApplicationStep =>
  model =>
    combineSteps(model, [
      applySavedIssueStep(savedIssue),
      informIssueChangedStep(savedIssue.issueId),
    ])

const informRetainedIssueDetailsStep: ApplicationStep = model => ({
  model,
  messages: Option.match(AsyncData.getData(model.workspaceAsyncData), {
    onNone: () => [],
    onSome: ({ issues }) => [
      model.issuePane.send(IssuePane.Message.InformedOfIssues({ issues })),
    ],
  }),
})

// ISSUE MOVES

const requestIssueMoveStep =
  (
    issueId: string,
    status: IssueStatus,
    insertionIndex: number,
  ): ApplicationStep =>
  model => {
    if (IssueMoveState.guards.MovingIssue(model.issueMove.model.state)) {
      return { model }
    }

    return Option.match(findIssue(model, issueId), {
      onNone: () => ({ model }),
      onSome: issue => ({
        model,
        messages: [
          model.issueMove.send(
            IssueMove.Message.RequestedMove({
              issueId: issue.id,
              status,
              insertionIndex,
              expectedVersion: issue.version,
            }),
          ),
          ...Option.match(Record.get(model.issueBoards, issue.projectId), {
            onNone: () => [],
            onSome: board => [
              board.send(
                IssueBoard.Message.InformedOfIssueMove({
                  status,
                  insertionIndex,
                }),
              ),
            ],
          }),
        ],
      }),
    })
  }

const applyMovedIssueStep = (movedIssue: MovedIssue) =>
  updateWorkspaceStep(workspace => applyMovedIssue(workspace, movedIssue))

const informBoardMoveFailureStep =
  (issueId: string): ApplicationStep =>
  model => ({
    model,
    messages: Option.match(
      Option.flatMap(findIssue(model, issueId), issue =>
        Record.get(model.issueBoards, issue.projectId),
      ),
      {
        onNone: () => [],
        onSome: board => [
          board.send(IssueBoard.Message.InformedOfIssueMoveFailure()),
        ],
      },
    ),
  })

// ACTIVITY

const ACTIVITY_TICK_INTERVAL = Duration.seconds(20)

const requestActivity = (model: Model) => ({
  model,
  messages: Option.match(AsyncData.getData(model.workspaceAsyncData), {
    onNone: () => [],
    onSome: workspace => [
      model.teammateActivity.send(
        TeammateActivity.Message.RequestedActivity({
          workspace,
          activeMemberId: activeMemberId(model),
          maybeActiveIssueId: Option.filter(
            maybeIssueId(model.route),
            issueId => Record.has(model.issuePane.model.issueDetails, issueId),
          ),
        }),
      ),
    ],
  }),
})

const informAssignmentStep =
  (issueId: string, actorId: string, createdAt: string): ApplicationStep =>
  model => ({
    model,
    messages: Option.match(findIssue(model, issueId), {
      onNone: () => [],
      onSome: issue => [
        informActivity(
          model,
          NotificationActivity.Assigned({ issue, actorId, createdAt }),
        ),
      ],
    }),
  })

// NAVIGATION

const initIssueBoardIfMissingStep =
  (children: Children, project: Project): ApplicationStep =>
  model =>
    Record.has(model.issueBoards, project.id)
      ? { model }
      : {
          model: modifyFields(model, {
            issueBoards: Record.set(
              project.id,
              children.issueBoard(project.id),
            ),
          }),
        }

const initProjectSettingsIfMissingStep =
  (children: Children, project: Project): ApplicationStep =>
  model =>
    Record.has(model.projectSettings, project.id)
      ? { model }
      : {
          model: modifyFields(model, {
            projectSettings: Record.set(
              project.id,
              children.projectSettings(project.id, { project }),
            ),
          }),
        }

const noopStep: ApplicationStep = model => ({ model })

const initChildrenStep =
  (children: Children): ApplicationStep =>
  model => {
    const maybeWorkspace = AsyncData.getData(model.workspaceAsyncData)

    if (Option.isNone(maybeWorkspace)) {
      return { model }
    }

    const workspace = maybeWorkspace.value
    const { route } = model

    const openIssueDetailStep: ApplicationStep = stepModel => ({
      model: stepModel,
      messages: pipe(
        maybeIssueId(route),
        Option.flatMap(issueId =>
          Array.findFirst(workspace.issues, issue => issue.id === issueId),
        ),
        Option.match({
          onNone: () => [],
          onSome: issue => [
            stepModel.issuePane.send(
              IssuePane.Message.RequestedOpen({ issue }),
            ),
          ],
        }),
      ),
    })

    const findProject = (projectId: string) =>
      Array.findFirst(workspace.projects, project => project.id === projectId)

    const initChildrenForRouteStep = ApplicationRoute.matchOrElse(
      route,
      {
        Board: ({ projectId }) =>
          Option.match(findProject(projectId), {
            onNone: () => noopStep,
            onSome: project => initIssueBoardIfMissingStep(children, project),
          }),
        ProjectSettings: ({ projectId }) =>
          Option.match(findProject(projectId), {
            onNone: () => noopStep,
            onSome: project =>
              initProjectSettingsIfMissingStep(children, project),
          }),
      },
      () => noopStep,
    )

    return combineSteps(model, [openIssueDetailStep, initChildrenForRouteStep])
  }

const openIssue = (model: Model, issueId: string) => ({
  model,
  commands: [NavigateInternal({ url: issueHref(model, issueId) })],
})

const navigateIssueFilters = (
  model: Model,
  change: (filters: IssueFilters) => IssueFilters,
) => ({
  model,
  commands: [
    NavigateInternal({
      url: issueFiltersHref(model, change(appliedIssueFilters(model))),
    }),
  ],
})

const closeIssue = (model: Model) => {
  const { route } = model

  if (ApplicationRoute.guards.Issue(route)) {
    return {
      model,
      commands: [NavigateInternal({ url: issuesRouter({}) })],
    }
  }

  if (!isPageRoute(route)) {
    return { model }
  }

  return {
    model,
    commands: [NavigateInternal({ url: routeToPath(withoutIssueId(route)) })],
  }
}

const requestCreation = (model: Model) =>
  Option.match(AsyncData.getData(model.workspaceAsyncData), {
    onNone: () => ({ model }),
    onSome: workspace => {
      const maybeProject = Option.match(maybeProjectId(model.route), {
        onNone: () => Array.head(workspace.projects),
        onSome: projectId =>
          Array.findFirst(
            workspace.projects,
            project => project.id === projectId,
          ),
      })

      return Option.match(maybeProject, {
        onNone: () => ({ model }),
        onSome: project => ({
          model,
          messages: [
            model.createIssue.send(
              CreateIssue.Message.RequestedOpen({ projectId: project.id }),
            ),
          ],
        }),
      })
    },
  })

const deleteSavedView = (model: Model, viewId: string) => {
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
    filters: appliedIssueFilters(model),
  })
  const maybeSelectedIssueId = maybeIssueId(model.route)

  if (Option.isNone(maybeSelectedIssueId)) {
    return {
      model: modifyFields(model, { savedViews: () => nextSavedViews }),
      commands: [NavigateInternal({ url: routeToPath(issuesRoute) })],
    }
  }

  const nextRoute = ApplicationRoute.Issues({
    filters: appliedIssueFilters(model),
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

const retryLoad = (model: Model) =>
  Option.match(AsyncData.revalidateOrLoad(model.workspaceAsyncData), {
    onNone: () => ({ model }),
    onSome: workspaceAsyncData => ({
      model: modifyFields(model, {
        workspaceAsyncData: () => workspaceAsyncData,
      }),
      commands: [LoadWorkspace()],
    }),
  })
// VIEW

const workspacePageView = (model: Model): Html =>
  model.workspacePage.view({
    route: model.route,
    workspaceAsyncData: visibleWorkspaceAsyncData(model),
    savedViews: model.savedViews,
    activeMemberId: activeMemberId(model),
    maybeNotice: model.maybeNotice,
    memberSwitcherView: ({ members }) => model.memberSwitcher.view({ members }),
    notificationCenterView: ({ issues, members }) =>
      model.notificationCenter.view({
        activeMemberId: activeMemberId(model),
        issues,
        members,
      }),
    issueMoveView: () => model.issueMove.view(),
    issueListView: ({ members, projects }, issues) =>
      model.issueList.view({
        filters: appliedIssueFilters(model),
        issueHrefs: issueHrefs(model, issues),
        issues,
        members,
        projects,
        maybeActiveIssueId: maybeIssueId(model.route),
      }),
    maybeIssueBoardView: (workspace, projectId, issues) =>
      Option.map(Record.get(model.issueBoards, projectId), board =>
        board.view({
          issueHrefs: issueHrefs(model, workspace.issues),
          isSaving: IssueMoveState.guards.MovingIssue(
            model.issueMove.model.state,
          ),
          issues,
          members: workspace.members,
        }),
      ),
    maybeProjectSettingsView: projectId =>
      Option.map(Record.get(model.projectSettings, projectId), settings =>
        settings.view(),
      ),
    memberDirectoryView: ({ members, issues }) =>
      model.memberDirectory.view({
        members,
        issues,
        issueHrefs: issueHrefs(model, issues),
      }),
    workspaceSettingsView: () =>
      model.workspaceSettings.view({
        maybeNotice: model.maybeNotice,
        maybeActivityError: model.teammateActivity.model.maybeActivityError,
        activityTick: model.teammateActivity.model.activityTick,
      }),
    issuePaneView: (workspace, issueId) =>
      model.issuePane.view({
        issueId,
        isFullPage: ApplicationRoute.guards.Issue(model.route),
        workspace,
        authorId: activeMemberId(model),
      }),
  })

const overlaysView = (model: Model, h: ApplicationViewBuilder): Html => {
  const paletteInputs = Option.match(maybeVisibleWorkspace(model), {
    onNone: () => ({ issues: [], projects: [] }),
    onSome: workspace => ({
      issues: workspace.issues,
      projects: workspace.projects,
    }),
  })
  const projects = Option.match(maybeVisibleWorkspace(model), {
    onNone: () => [],
    onSome: workspace => workspace.projects,
  })

  return h.div(
    [],
    [
      model.commandPalette.view(paletteInputs),
      model.createIssue.view({ projects }),
    ],
  )
}

// LIVE

const ChildrenLive = Layer.mergeAll(
  SidebarLive,
  WorkspacePageLive,
  MemberSwitcherLive,
  IssueListLive,
  CreateIssueLive,
  IssueMoveLive,
  CommandPaletteLive,
  MemberDirectoryLive,
  NotificationCenterLive,
  WorkspaceSettingsLive,
  TeammateActivityLive,
  IssuePaneLive,
  IssueBoardLive,
  ProjectSettingsLive,
)

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const repository = yield* WorkspaceRepository
    const children = yield* makeChildren

    return {
      model: {
        route: urlToApplicationRoute(url),
        workspaceAsyncData: WorkspaceAsyncData.Loading(),
        sidebar: children.sidebar,
        workspacePage: children.workspacePage,
        memberSwitcher: children.memberSwitcher,
        issueList: children.issueList,
        createIssue: children.createIssue,
        issueBoards: {},
        issueMove: children.issueMove,
        commandPalette: children.commandPalette,
        memberDirectory: children.memberDirectory,
        notificationCenter: children.notificationCenter,
        workspaceSettings: children.workspaceSettings,
        teammateActivity: children.teammateActivity,
        issuePane: children.issuePane,
        maybeNotice: Option.none(),
        savedViews: [],
        nextSavedViewId: 1,
        projectSettings: {},
      },

      start: [LoadWorkspace()],

      update: {
        ClickedLink: (model, { request }) => ({
          model,
          commands: UrlRequest.match(request, {
            Internal: ({ url: internalUrl }) => [
              NavigateInternal({ url: urlToString(internalUrl) }),
            ],
            External: ({ href }) => [LoadExternal({ href })],
          }),
        }),
        ChangedUrl: (model, { url: nextUrl }) =>
          initChildrenStep(children)(
            modifyFields(model, {
              route: () => urlToApplicationRoute(nextUrl),
              maybeNotice: () => Option.none(),
            }),
          ),
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
        CompletedReplaceInternalUrl: model => ({ model }),
        SucceededLoadWorkspace: (model, { workspace }) =>
          combineSteps(model, [
            applyWorkspaceSnapshotStep(workspace),
            initChildrenStep(children),
            informRetainedIssueDetailsStep,
          ]),
        FailedLoadWorkspace: (model, { error }) => ({
          model: modifyFields(model, {
            workspaceAsyncData: workspaceAsyncData =>
              AsyncData.settle(workspaceAsyncData, Result.fail(error)),
          }),
        }),
        TickedActivityStream: requestActivity,
        ...children.teammateActivity.on<Model>({
          AddedComment: (model, { issueId, comment }) =>
            applyIssueCommentStep(issueId, comment)(model),
          AssignedIssue: (model, { savedIssue, actorId, createdAt }) => {
            const isNewAssignment = pipe(
              findIssue(model, savedIssue.issueId),
              Option.exists(
                previousIssue =>
                  savedIssue.revision.version > previousIssue.version &&
                  Option.exists(
                    savedIssue.revision.fields.maybeAssigneeId,
                    recipientId =>
                      !Option.contains(
                        previousIssue.maybeAssigneeId,
                        recipientId,
                      ),
                  ),
              ),
            )

            return combineSteps(model, [
              receiveSavedIssueStep(savedIssue),
              ...Array.filter(
                [informAssignmentStep(savedIssue.issueId, actorId, createdAt)],
                () => isNewAssignment,
              ),
            ])
          },
        }),
        ...children.workspacePage.on<Model>({
          RequestedRetryLoad: retryLoad,
        }),
        ...children.sidebar.on<Model>({
          RequestedCommandPalette: model => ({
            model,
            messages: [
              model.commandPalette.send(CommandPalette.Message.RequestedOpen()),
            ],
          }),
          RequestedDeleteSavedView: (model, { viewId }) =>
            deleteSavedView(model, viewId),
        }),
        ...children.workspaceSettings.on<Model>({
          RequestedActivity: requestActivity,
          ScheduledSaveFailure: showNoticeStep(
            'The next save will fail. Your draft will be kept so you can retry.',
          ),
        }),
        ...children.createIssue.on<Model>({
          Created: (model, { issue }) =>
            openIssue(
              modifyFields(model, {
                workspaceAsyncData: AsyncData.map(workspace =>
                  modifyFields(workspace, { issues: Array.append(issue) }),
                ),
                maybeNotice: () => Option.some(`${issue.identifier} created`),
              }),
              issue.id,
            ),
        }),
        ...children.notificationCenter.on<Model>({
          SelectedIssue: (model, { issueId }) => openIssue(model, issueId),
        }),
        ...children.issuePane.on<Model>({
          Saved: (model, { savedIssue }) =>
            combineSteps(model, [
              applySavedIssueStep(savedIssue),
              showNoticeStep(`${savedIssue.identifier} saved`),
            ]),
          AddedComment: (model, { issueId, comment }) =>
            applyIssueCommentStep(issueId, comment)(model),
          ReceivedIssue: (model, { issue }) =>
            applyIssueSnapshotStep(issue)(model),
          Closed: closeIssue,
        }),
        ...children.issueList.on<Model>({
          SavedFilter: (model, { name, filters }) => ({
            model: modifyFields(model, {
              savedViews: Array.append(
                SavedView.make({
                  id: `view-${model.nextSavedViewId}`,
                  name,
                  filters,
                }),
              ),
              nextSavedViewId: Number.increment,
              maybeNotice: () => Option.some(`Saved view “${name}”`),
            }),
          }),
          ChangedQuery: (model, { query }) => ({
            model,
            commands: [
              ReplaceInternalUrl({
                url: issueFiltersHref(
                  model,
                  modifyFields(appliedIssueFilters(model), {
                    query: () => query,
                  }),
                ),
              }),
            ],
          }),
          ChangedStatusFilter: (model, { maybeStatus }) =>
            navigateIssueFilters(model, filters =>
              modifyFields(filters, { maybeStatus: () => maybeStatus }),
            ),
          ChangedSort: (model, { sort }) =>
            navigateIssueFilters(model, filters =>
              modifyFields(filters, { sort: () => sort }),
            ),
          ChangedGrouping: (model, { groupBy }) =>
            navigateIssueFilters(model, filters =>
              modifyFields(filters, { groupBy: () => groupBy }),
            ),
          RequestedClearFilters: model =>
            navigateIssueFilters(model, filters =>
              modifyFields(filters, {
                query: () => '',
                maybeStatus: () => Option.none(),
              }),
            ),
          RequestedCreation: requestCreation,
        }),
        ...children.issueBoard.on<Model>({
          RequestedCreation: (model, { status }, board) => ({
            model,
            messages: [
              model.createIssue.send(
                CreateIssue.Message.RequestedOpen({
                  projectId: board.id,
                  status,
                }),
              ),
            ],
          }),
          RequestedMove: (model, { issueId, status, insertionIndex }) =>
            requestIssueMoveStep(issueId, status, insertionIndex)(model),
        }),
        ...children.issueMove.on<Model>({
          Moved: (model, { movedIssue }) =>
            combineSteps(model, [
              applyMovedIssueStep(movedIssue),
              showNoticeStep('Issue moved'),
              informIssueChangedStep(movedIssue.issueId),
            ]),
          FailedMove: (model, { issueId, error }) =>
            RepositoryError.guards.Conflict(error)
              ? combineSteps(model, [
                  receiveIssueSnapshotStep(error.latestIssue),
                  informBoardMoveFailureStep(issueId),
                ])
              : informBoardMoveFailureStep(issueId)(model),
          RequestedRetry: (model, { issueId, status, insertionIndex }) =>
            requestIssueMoveStep(issueId, status, insertionIndex)(model),
        }),
        ...children.commandPalette.on<Model>({
          SelectedIssue: (model, { issueId }) => openIssue(model, issueId),
          SelectedProject: (model, { projectId }) => ({
            model,
            commands: [NavigateInternal({ url: projectRouter({ projectId }) })],
          }),
        }),
        ...children.projectSettings.on<Model>({
          Saved: (model, { project }) =>
            updateWorkspaceStep(workspace =>
              modifyFields(workspace, {
                projects: Array.map(currentProject =>
                  currentProject.id === project.id ? project : currentProject,
                ),
              }),
            )(model),
        }),
      },

      commands: {
        LoadWorkspace: () =>
          repository.load.pipe(
            Effect.map(workspace =>
              Message.SucceededLoadWorkspace({ workspace }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedLoadWorkspace({ error: error.message }),
              ),
            ),
          ),
        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
        ReplaceInternalUrl: ({ url: internalUrl }) =>
          replaceUrl(internalUrl).pipe(
            Effect.as(Message.CompletedReplaceInternalUrl()),
          ),
      },

      subscriptions: {
        activity: {
          dependencies: model => AsyncData.hasData(model.workspaceAsyncData),
          stream: (hasWorkspace: boolean): Stream.Stream<Message> =>
            hasWorkspace
              ? Stream.tick(ACTIVITY_TICK_INTERVAL).pipe(
                  Stream.drop(1),
                  Stream.map(() => Message.TickedActivityStream()),
                )
              : Stream.empty,
        },
      },

      view: (model, h) => ({
        title: documentTitle(
          model.route,
          model.savedViews,
          maybeVisibleWorkspace(model),
        ),
        body: h.div(
          [
            h.Class(
              'flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-sm font-medium text-slate-700 antialiased lg:flex-row',
            ),
          ],
          [
            model.sidebar.view({
              route: model.route,
              savedViews: model.savedViews,
              maybeConfirmedWorkspace: AsyncData.getData(
                model.workspaceAsyncData,
              ),
              issueDrafts: unsavedIssueDrafts(model.issuePane.model),
              toIssueHref: issueId => issueHref(model, issueId),
            }),
            workspacePageView(model),
            overlaysView(model, h),
          ],
        ),
      }),
    }
  }),
).pipe(Layer.provide(ChildrenLive))
