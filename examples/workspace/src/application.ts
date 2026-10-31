import { clsx } from 'clsx'
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

import { Button, Nav } from '@foldkit/ui'

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
import { missingPage } from './domain/missingPage'
import { navigationLink } from './domain/navigationLink'
import { documentTitle, pageTitle } from './domain/pageTitle'
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
  boardRouter,
  isPageRoute,
  issueFiltersHref,
  issueHref,
  issueHrefs,
  issuesRouter,
  maybeIssueId,
  maybeProjectId,
  maybeRouteFilters,
  myIssuesRouter,
  peopleRouter,
  projectRouter,
  routeToPath,
  savedViewRouter,
  settingsRouter,
  urlToApplicationRoute,
  withoutIssueId,
} from './route'
import { RepositoryError, WorkspaceRepository } from './services'
import { TeammateActivity, TeammateActivityLive } from './teammateActivity'

// MODEL

const WorkspaceAsyncData = AsyncData.Schema(Workspace, Schema.String)

export const Model = Schema.Struct({
  route: ApplicationRoute,
  workspaceAsyncData: WorkspaceAsyncData.schema,
  memberSwitcher: MemberSwitcher,
  issueList: IssueList,
  createIssue: CreateIssue,
  issueBoards: Schema.Record(Schema.String, IssueBoard),
  issueMove: IssueMove,
  commandPalette: CommandPalette,
  memberDirectory: MemberDirectory,
  notificationCenter: NotificationCenter,
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
  ClickedRetryLoad: {},
  ClickedOpenCommandPalette: {},
  ClickedDeleteSavedView: { viewId: Schema.String },
  ClickedSimulateActivity: {},
  ClickedSimulateSaveFailure: {},
  CompletedSimulateSaveFailure: {},
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

export const SimulateSaveFailure = Command.define('SimulateSaveFailure', {
  messages: [Message.CompletedSimulateSaveFailure],
})

type ApplicationCommand =
  | ReturnType<typeof LoadWorkspace>
  | ReturnType<typeof NavigateInternal>
  | ReturnType<typeof LoadExternal>
  | ReturnType<typeof ReplaceInternalUrl>
  | ReturnType<typeof SimulateSaveFailure>

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
      SimulateSaveFailure,
    ],
  },
) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const repository = yield* WorkspaceRepository
    const memberSwitcher = yield* new MemberSwitcher('memberSwitcher')
    const issueList = yield* new IssueList('issueList')
    const createIssue = yield* new CreateIssue('createIssue')
    const issueMove = yield* new IssueMove('issueMove')
    const commandPalette = yield* new CommandPalette('commandPalette')
    const memberDirectory = yield* new MemberDirectory('memberDirectory')
    const notificationCenter = yield* new NotificationCenter(
      'notificationCenter',
    )
    const teammateActivity = yield* new TeammateActivity('teammateActivity')
    const issuePane = yield* new IssuePane('issuePane')
    const issueBoard = yield* IssueBoard.each('issueBoards')
    const projectSettings = yield* ProjectSettings.each('projectSettings')

    return {
      model: {
        route: urlToApplicationRoute(url),
        workspaceAsyncData: WorkspaceAsyncData.Loading(),
        memberSwitcher,
        issueList,
        createIssue,
        issueBoards: {},
        issueMove,
        commandPalette,
        memberDirectory,
        notificationCenter,
        teammateActivity,
        issuePane,
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
          combineSteps(model, [
            stepModel => ({
              model: modifyFields(stepModel, {
                route: () => urlToApplicationRoute(nextUrl),
                maybeNotice: () => Option.none(),
              }),
            }),
            initChildrenStep(issueBoard, projectSettings),
          ]),
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
        CompletedReplaceInternalUrl: model => ({ model }),
        SucceededLoadWorkspace: (model, { workspace }) =>
          combineSteps(model, [
            applyWorkspaceSnapshotStep(workspace),
            initChildrenStep(issueBoard, projectSettings),
            informRetainedIssueDetailsStep,
          ]),
        FailedLoadWorkspace: (model, { error }) => ({
          model: modifyFields(model, {
            workspaceAsyncData: workspaceAsyncData =>
              AsyncData.settle(workspaceAsyncData, Result.fail(error)),
          }),
        }),
        TickedActivityStream: requestActivity,
        ClickedRetryLoad: retryLoad,
        ClickedOpenCommandPalette: model => ({
          model,
          messages: [
            model.commandPalette.send(CommandPalette.Message.RequestedOpen()),
          ],
        }),
        ClickedDeleteSavedView: (model, { viewId }) =>
          deleteSavedView(model, viewId),
        ClickedSimulateActivity: requestActivity,
        ClickedSimulateSaveFailure: model => ({
          model,
          commands: [SimulateSaveFailure()],
        }),
        CompletedSimulateSaveFailure: showNoticeStep(
          'The next save will fail. Your draft will be kept so you can retry.',
        ),
        ...teammateActivity.on<Model>({
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
        ...createIssue.on<Model>({
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
        ...notificationCenter.on<Model>({
          SelectedIssue: (model, { issueId }) => openIssue(model, issueId),
        }),
        ...issuePane.on<Model>({
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
        ...issueList.on<Model>({
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
        ...issueBoard.on<Model>({
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
        ...issueMove.on<Model>({
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
        ...commandPalette.on<Model>({
          SelectedIssue: (model, { issueId }) => openIssue(model, issueId),
          SelectedProject: (model, { projectId }) => ({
            model,
            commands: [NavigateInternal({ url: projectRouter({ projectId }) })],
          }),
        }),
        ...projectSettings.on<Model>({
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
        SimulateSaveFailure: () =>
          repository
            .failNext('Save')
            .pipe(Effect.as(Message.CompletedSimulateSaveFailure())),
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
            sidebarView(model, h),
            workspacePageView(model, h),
            overlaysView(model, h),
          ],
        ),
      }),
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      MemberSwitcherLive,
      IssueListLive,
      CreateIssueLive,
      IssueMoveLive,
      CommandPaletteLive,
      MemberDirectoryLive,
      NotificationCenterLive,
      TeammateActivityLive,
      IssuePaneLive,
      IssueBoardLive,
      ProjectSettingsLive,
    ),
  ),
)

type ApplicationStep = (model: Model) => Readonly<{
  model: Model
  commands?: ReadonlyArray<ApplicationCommand> | undefined
  messages?: ReadonlyArray<Send> | undefined
}>

type ApplicationViewBuilder = HtmlBuilder<Message, unknown>

type IssueBoardFactory = (projectId: string) => Model['issueBoards'][string]
type ProjectSettingsFactory = (
  projectId: string,
  args: Readonly<{ project: Project }>,
) => Model['projectSettings'][string]

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
  (issueBoard: IssueBoardFactory, project: Project): ApplicationStep =>
  model =>
    Record.has(model.issueBoards, project.id)
      ? { model }
      : {
          model: modifyFields(model, {
            issueBoards: Record.set(project.id, issueBoard(project.id)),
          }),
        }

const initProjectSettingsIfMissingStep =
  (
    projectSettings: ProjectSettingsFactory,
    project: Project,
  ): ApplicationStep =>
  model =>
    Record.has(model.projectSettings, project.id)
      ? { model }
      : {
          model: modifyFields(model, {
            projectSettings: Record.set(
              project.id,
              projectSettings(project.id, { project }),
            ),
          }),
        }

const noopStep: ApplicationStep = model => ({ model })

const initChildrenStep =
  (
    issueBoard: IssueBoardFactory,
    projectSettings: ProjectSettingsFactory,
  ): ApplicationStep =>
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
            onSome: project => initIssueBoardIfMissingStep(issueBoard, project),
          }),
        ProjectSettings: ({ projectId }) =>
          Option.match(findProject(projectId), {
            onNone: () => noopStep,
            onSome: project =>
              initProjectSettingsIfMissingStep(projectSettings, project),
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

// SIDEBAR VIEW

const SIDEBAR_COLLECTION_CLASS =
  'col-span-2 w-full border-t border-slate-200 pt-5 lg:mt-6'

const SAVED_VIEW_LINK_CLASS =
  'min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm'

const DRAFT_LINK_CLASS = 'block rounded-lg px-3 py-2'

const sidebarView = (model: Model, h: ApplicationViewBuilder): Html => {
  const { route } = model
  const maybeConfirmedWorkspace = AsyncData.getData(model.workspaceAsyncData)
  const maybeCurrentProjectId = maybeProjectId(route)

  const workspacePages = {
    'All issues': {
      href: issuesRouter({}),
      isCurrent: ApplicationRoute.guards.Issues(route),
    },
    'My issues': {
      href: myIssuesRouter({}),
      isCurrent: ApplicationRoute.guards.MyIssues(route),
    },
    People: {
      href: peopleRouter({}),
      isCurrent: ApplicationRoute.guards.People(route),
    },
    Settings: {
      href: settingsRouter({}),
      isCurrent: ApplicationRoute.guards.Settings(route),
    },
  }

  return h.aside(
    [
      h.Class(
        'grid max-h-[40dvh] shrink-0 grid-cols-[1fr_auto] items-start gap-4 overflow-y-auto border-b border-slate-200 bg-slate-100/80 p-4 lg:flex lg:h-full lg:max-h-none lg:w-60 lg:flex-col lg:gap-0 lg:border-r lg:border-b-0 lg:p-5',
      ),
    ],
    [
      h.a(
        [
          h.Href(issuesRouter({})),
          h.Class(
            'flex min-h-10 items-center gap-2.5 px-1 text-lg font-semibold tracking-tight text-slate-800 lg:mb-7 lg:px-2',
          ),
        ],
        [
          h.span(
            [
              h.AriaHidden(true),
              h.Class(
                'grid size-8 place-items-center rounded-xl bg-indigo-600 text-sm text-white shadow-sm',
              ),
            ],
            ['N'],
          ),
          'Northstar',
        ],
      ),
      Button.view(
        {
          type: 'button',
          onClick: Message.ClickedOpenCommandPalette(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel('Search workspace'),
                h.Class('button w-full justify-between lg:mb-5'),
              ],
              [
                h.span([h.Class('sm:hidden')], ['Search']),
                h.span([h.Class('hidden sm:inline')], ['Search workspace']),
                h.kbd(
                  [
                    h.Class(
                      'hidden rounded border border-slate-200 px-1 text-xs font-medium text-slate-600 sm:inline',
                    ),
                  ],
                  ['⌘ K'],
                ),
              ],
            ),
        },
        h,
      ),
      h.div(
        [h.Class('col-span-2 w-full')],
        [
          Nav.view({
            items: Record.keys(workspacePages),
            ariaLabel: 'Workspace navigation',
            toHref: label => workspacePages[label].href,
            isItemCurrent: label => workspacePages[label].isCurrent,
            toView: ({ nav, items }) =>
              h.nav(
                [...nav, h.Class('flex w-full flex-wrap gap-1 lg:flex-col')],
                Array.map(items, item => navigationLink(item, item.value, h)),
              ),
          }),
          h.p(
            [
              h.Class(
                'mt-5 hidden px-3 pb-2 text-xs font-semibold tracking-wider text-slate-600 uppercase lg:block',
              ),
            ],
            ['Projects'],
          ),
          ...Option.match(maybeConfirmedWorkspace, {
            onNone: () => [],
            onSome: ({ projects }) => [
              Nav.view({
                items: Array.map(projects, project => project.id),
                ariaLabel: 'Projects',
                toHref: projectId => projectRouter({ projectId }),
                isItemCurrent: projectId =>
                  Option.contains(maybeCurrentProjectId, projectId),
                toView: ({ nav, items }) =>
                  h.nav(
                    [
                      ...nav,
                      h.Class('flex w-full flex-wrap gap-1 lg:flex-col'),
                    ],
                    Array.map(Array.zip(items, projects), ([item, project]) =>
                      navigationLink(item, project.name, h),
                    ),
                  ),
              }),
            ],
          }),
        ],
      ),
      savedViewsSection(route, model.savedViews, h),
      draftsSection(model, maybeConfirmedWorkspace, h),
      h.div(
        [
          h.Class(
            'mt-auto hidden pt-10 text-xs font-medium leading-6 text-slate-500 lg:block',
          ),
        ],
        [h.p([], ['Demo data resets on reload'])],
      ),
    ],
  )
}

const savedViewsSection = (
  route: ApplicationRoute,
  savedViews: ReadonlyArray<SavedView>,
  h: ApplicationViewBuilder,
): Html =>
  h.section(
    [
      h.Class(
        clsx({
          hidden: Array.isReadonlyArrayEmpty(savedViews),
          [SIDEBAR_COLLECTION_CLASS]: Array.isReadonlyArrayNonEmpty(savedViews),
        }),
      ),
      h.AriaLabel('Saved views'),
    ],
    [
      h.h2(
        [
          h.Class(
            'mb-2 px-3 text-xs font-semibold tracking-wider text-slate-600 uppercase',
          ),
        ],
        ['Saved views'],
      ),
      ...Array.match(savedViews, {
        onEmpty: () => [],
        onNonEmpty: nonEmptySavedViews =>
          Array.map(nonEmptySavedViews, savedView =>
            h.keyed('div')(
              savedView.id,
              [h.Class('flex items-center gap-1')],
              [
                h.a(
                  [
                    h.Href(
                      savedViewRouter({
                        viewId: savedView.id,
                        filters: savedView.filters,
                      }),
                    ),
                    h.Class(
                      clsx(SAVED_VIEW_LINK_CLASS, {
                        'bg-white font-semibold text-indigo-700':
                          ApplicationRoute.guards.SavedView(route) &&
                          route.viewId === savedView.id,
                        'font-medium text-slate-600 hover:bg-white/60':
                          !ApplicationRoute.guards.SavedView(route) ||
                          route.viewId !== savedView.id,
                      }),
                    ),
                  ],
                  [savedView.name],
                ),
                Button.view(
                  {
                    type: 'button',
                    onClick: Message.ClickedDeleteSavedView({
                      viewId: savedView.id,
                    }),
                    toView: attributes =>
                      h.button(
                        [
                          ...attributes.button,
                          h.AriaLabel(`Delete view ${savedView.name}`),
                          h.Class(
                            'inline-grid size-7 cursor-pointer place-items-center rounded text-sm font-medium text-slate-600 outline-offset-2 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-indigo-500',
                          ),
                        ],
                        ['×'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ),
      }),
    ],
  )

const draftsSection = (
  model: Model,
  maybeConfirmedWorkspace: Option.Option<Workspace>,
  h: ApplicationViewBuilder,
): Html => {
  const issueDrafts = unsavedIssueDrafts(model.issuePane.model)

  return h.section(
    [
      h.Class(
        clsx({
          hidden: Array.isReadonlyArrayEmpty(issueDrafts),
          [SIDEBAR_COLLECTION_CLASS]:
            Array.isReadonlyArrayNonEmpty(issueDrafts),
        }),
      ),
      h.AriaLabel('Drafts'),
    ],
    [
      h.h2(
        [
          h.Class(
            'mb-2 px-3 text-xs font-semibold tracking-wider text-slate-600 uppercase',
          ),
        ],
        ['Drafts'],
      ),
      ...Array.map(issueDrafts, retainedDraft => {
        const maybeIssue = Option.flatMap(maybeConfirmedWorkspace, workspace =>
          Array.findFirst(
            workspace.issues,
            issue => issue.id === retainedDraft.issueId,
          ),
        )
        const isActive = Option.contains(
          maybeIssueId(model.route),
          retainedDraft.issueId,
        )

        return h.keyed('div')(
          retainedDraft.issueId,
          [],
          [
            h.a(
              [
                h.Href(issueHref(model, retainedDraft.issueId)),
                h.Class(
                  clsx(DRAFT_LINK_CLASS, {
                    'bg-white text-indigo-700 shadow-xs': isActive,
                    'text-slate-500 transition hover:bg-white/60 hover:text-slate-800':
                      !isActive,
                  }),
                ),
                ...(isActive ? [h.AriaCurrent('page')] : []),
              ],
              [
                h.span(
                  [h.Class('block text-xs font-semibold')],
                  [
                    Option.match(maybeIssue, {
                      onNone: () => retainedDraft.issueId,
                      onSome: issue => issue.identifier,
                    }),
                  ],
                ),
                h.span(
                  [h.Class('block truncate text-sm font-medium')],
                  [retainedDraft.title],
                ),
              ],
            ),
          ],
        )
      }),
    ],
  )
}

// WORKSPACE PAGE VIEW

const workspacePageView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.main(
    [h.Class('flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto')],
    [
      h.div(
        [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
        [Option.getOrElse(model.maybeNotice, () => '')],
      ),
      ApplicationRoute.guards.NotFound(model.route)
        ? notFoundView(h)
        : AsyncData.matchDataSplitEmpty(visibleWorkspaceAsyncData(model), {
            onIdle: () => workspaceLoadingView(h),
            onLoading: () => workspaceLoadingView(h),
            onFailure: error => workspaceFailureView(error, h),
            onData: workspace => workspaceView(model, workspace, h),
          }),
    ],
  )

const projectTabs = (
  project: Project,
  route: ApplicationRoute,
  h: ApplicationViewBuilder,
): Html => {
  const projectPageRoutes = {
    Overview: ApplicationRoute.ProjectOverview({ projectId: project.id }),
    Issues: ApplicationRoute.Project({ projectId: project.id }),
    Board: ApplicationRoute.Board({ projectId: project.id }),
    'Project settings': ApplicationRoute.ProjectSettings({
      projectId: project.id,
    }),
  }

  return Nav.view({
    items: Record.keys(projectPageRoutes),
    ariaLabel: 'Project navigation',
    toHref: label => routeToPath(projectPageRoutes[label]),
    isItemCurrent: label => projectPageRoutes[label]._tag === route._tag,
    toView: ({ nav, items }) =>
      h.nav(
        [
          ...nav,
          h.Class('flex flex-wrap gap-1 border-b border-slate-200 px-2 pb-3'),
        ],
        Array.map(items, item => navigationLink(item, item.value, h)),
      ),
  })
}

const projectStatistic = (
  label: string,
  count: number,
  itemClass: string,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class(itemClass)],
    [
      h.dt([h.Class('text-sm font-medium text-slate-600')], [label]),
      h.dd(
        [h.Class('mt-1 text-xl font-semibold text-slate-800')],
        [`${count}`],
      ),
    ],
  )

const projectOverview = (
  project: Project,
  workspace: Workspace,
  h: ApplicationViewBuilder,
): Html => {
  const projectIssues = Array.filter(
    workspace.issues,
    issue => issue.projectId === project.id,
  )
  const completedIssues = Array.filter(
    projectIssues,
    issue => issue.status === 'Done',
  )
  const inProgressIssues = Array.filter(
    projectIssues,
    issue => issue.status === 'InProgress',
  )

  return h.section(
    [h.Class('space-y-6 p-5 lg:p-8'), h.AriaLabel('Project overview')],
    [
      h.div(
        [
          h.Class(
            'flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end',
          ),
        ],
        [
          h.p(
            [h.Class('max-w-2xl text-sm leading-6 text-slate-500')],
            [project.description],
          ),
          h.a(
            [
              h.Href(boardRouter({ projectId: project.id })),
              h.Class(
                'shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-800',
              ),
            ],
            ['Open board'],
          ),
        ],
      ),
      h.dl(
        [
          h.Class(
            'grid divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0',
          ),
        ],
        [
          projectStatistic(
            'Total issues',
            projectIssues.length,
            'py-4 sm:px-5 sm:first:pl-0',
            h,
          ),
          projectStatistic(
            'In progress',
            inProgressIssues.length,
            'py-4 sm:px-5',
            h,
          ),
          projectStatistic(
            'Completed',
            completedIssues.length,
            'py-4 sm:px-5',
            h,
          ),
        ],
      ),
    ],
  )
}

const issueListView = (
  model: Model,
  { members, projects }: Workspace,
  issues: ReadonlyArray<Issue>,
): Html =>
  model.issueList.view({
    filters: appliedIssueFilters(model),
    issueHrefs: issueHrefs(model, issues),
    issues,
    members,
    projects,
    maybeActiveIssueId: maybeIssueId(model.route),
  })

const routeContent = (
  model: Model,
  workspace: Workspace,
  h: ApplicationViewBuilder,
): Html => {
  const { route } = model

  const projectContent = (
    projectId: string,
    toView: (project: Project) => Html,
  ) =>
    Option.match(
      Array.findFirst(workspace.projects, project => project.id === projectId),
      {
        onNone: () =>
          missingPage(
            'This project is unavailable',
            'This project is not part of the workspace.',
            h,
          ),
        onSome: toView,
      },
    )

  const projectIssues = (projectId: string) =>
    Array.filter(workspace.issues, issue => issue.projectId === projectId)

  return ApplicationRoute.match<Html>(route, {
    Issues: () => issueListView(model, workspace, workspace.issues),
    MyIssues: () =>
      issueListView(
        model,
        workspace,
        Array.filter(workspace.issues, issue =>
          Option.contains(issue.maybeAssigneeId, activeMemberId(model)),
        ),
      ),
    Project: ({ projectId }) =>
      projectContent(projectId, () =>
        issueListView(model, workspace, projectIssues(projectId)),
      ),
    ProjectOverview: ({ projectId }) =>
      projectContent(projectId, project =>
        projectOverview(project, workspace, h),
      ),
    ProjectSettings: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.match(Record.get(model.projectSettings, projectId), {
          onNone: () => h.empty,
          onSome: settings => settings.view(),
        }),
      ),
    Board: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.match(Record.get(model.issueBoards, projectId), {
          onNone: () =>
            h.p(
              [h.Class('p-8 text-sm text-slate-500'), h.Role('status')],
              ['Loading board…'],
            ),
          onSome: board =>
            board.view({
              issueHrefs: issueHrefs(model, workspace.issues),
              isSaving: IssueMoveState.guards.MovingIssue(
                model.issueMove.model.state,
              ),
              issues: projectIssues(projectId),
              members: workspace.members,
            }),
        }),
      ),
    People: () =>
      model.memberDirectory.view({
        members: workspace.members,
        issues: workspace.issues,
        issueHrefs: issueHrefs(model, workspace.issues),
      }),
    Settings: () => workspaceSettingsView(model, h),
    SavedView: ({ viewId }) =>
      Option.match(
        Array.findFirst(model.savedViews, savedView => savedView.id === viewId),
        {
          onNone: () =>
            Option.match(maybeRouteFilters(route), {
              onNone: () =>
                missingPage(
                  'This saved view is unavailable',
                  'Save a new set of issue filters to create a view.',
                  h,
                ),
              onSome: () => issueListView(model, workspace, workspace.issues),
            }),
          onSome: () => issueListView(model, workspace, workspace.issues),
        },
      ),
    Issue: () => h.empty,
    NotFound: () =>
      missingPage(
        'Page not found',
        'Choose a page from the workspace navigation.',
        h,
      ),
  })
}

const workspaceView = (
  model: Model,
  workspace: Workspace,
  h: ApplicationViewBuilder,
): Html => {
  const { route } = model
  const maybeProject = Option.flatMap(maybeProjectId(route), projectId =>
    Array.findFirst(workspace.projects, project => project.id === projectId),
  )
  const maybeSelectedIssueId = maybeIssueId(route)

  return h.div(
    [h.Class('flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden')],
    [
      h.header(
        [
          h.Class(
            'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3',
          ),
        ],
        [
          h.h1(
            [h.Class('text-lg font-semibold text-slate-900')],
            [pageTitle(route, model.savedViews, workspace)],
          ),
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              model.memberSwitcher.view({ members: workspace.members }),
              model.notificationCenter.view({
                activeMemberId: activeMemberId(model),
                issues: workspace.issues,
                members: workspace.members,
              }),
            ],
          ),
        ],
      ),
      Option.match(maybeProject, {
        onNone: () => h.empty,
        onSome: project => projectTabs(project, route, h),
      }),
      model.issueMove.view(),
      h.div(
        [
          h.Class(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-slate-200 xl:flex-row',
          ),
        ],
        [
          ...(!ApplicationRoute.guards.Issue(route)
            ? [
                h.div(
                  [
                    h.Class(
                      clsx(
                        'min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain',
                        {
                          'hidden xl:block':
                            Option.isSome(maybeSelectedIssueId),
                        },
                      ),
                    ),
                  ],
                  [routeContent(model, workspace, h)],
                ),
              ]
            : []),
          ...Option.match(maybeSelectedIssueId, {
            onNone: () => [],
            onSome: issueId => [
              model.issuePane.view({
                issueId,
                isFullPage: ApplicationRoute.guards.Issue(route),
                workspace,
                authorId: activeMemberId(model),
              }),
            ],
          }),
        ],
      ),
    ],
  )
}

const workspaceLoadingView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'grid min-h-[60vh] place-content-center px-8 text-sm text-slate-500',
      ),
      h.Role('status'),
    ],
    ['Loading workspace…'],
  )

const workspaceFailureView = (error: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'mx-auto my-20 max-w-md rounded-xl border border-rose-100 bg-white p-8 text-center',
      ),
      h.Role('alert'),
    ],
    [
      h.h1(
        [h.Class('mb-3 text-lg font-semibold text-slate-700')],
        ['Unable to load workspace'],
      ),
      h.p([h.Class('mb-6 text-sm leading-6 text-slate-500')], [error]),
      Button.view(
        {
          onClick: Message.ClickedRetryLoad(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button-primary')],
              ['Retry loading'],
            ),
        },
        h,
      ),
    ],
  )

const notFoundView = (h: ApplicationViewBuilder): Html =>
  h.section(
    [h.Class('p-8')],
    [
      h.h1(
        [h.Class('mb-3 text-2xl font-semibold text-slate-800')],
        ['Page not found'],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        ['Choose a page from the workspace navigation.'],
      ),
    ],
  )

// WORKSPACE SETTINGS VIEW

const workspaceSettingsView = (
  model: Model,
  h: ApplicationViewBuilder,
): Html => {
  const { maybeActivityError, activityTick } = model.teammateActivity.model

  return h.section(
    [h.Class('max-w-2xl space-y-6 p-5')],
    [
      h.div(
        [h.Class('space-y-2')],
        [
          h.h2(
            [h.Class('text-base font-semibold text-slate-800')],
            ['Demo controls'],
          ),
          h.p(
            [h.Class('text-sm leading-6 text-slate-600')],
            [
              'Changes last for this session. Reloading restores the sample workspace.',
            ],
          ),
          Option.match(model.maybeNotice, {
            onNone: () => h.empty,
            onSome: notice =>
              h.p([h.Class('text-sm leading-6 text-slate-600')], [notice]),
          }),
        ],
      ),
      h.div(
        [h.Class('border-t border-slate-200 pt-5')],
        [
          h.h3(
            [h.Class('mb-2 text-base font-semibold text-slate-800')],
            ['Live activity'],
          ),
          h.p(
            [h.Class('mb-4 text-sm leading-6 text-slate-600')],
            [
              'Teammate activity arrives every 20 seconds. Comments and assignments appear in Notifications.',
            ],
          ),
          Option.match(maybeActivityError, {
            onNone: () => h.empty,
            onSome: error =>
              h.p(
                [h.Role('alert'), h.Class('mb-4 text-sm text-rose-700')],
                [error],
              ),
          }),
          h.div(
            [h.Class('flex flex-wrap items-center gap-4')],
            [
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedSimulateActivity(),
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class('button')],
                      ['Simulate activity'],
                    ),
                },
                h,
              ),
              h.p(
                [h.Class('text-[13px] text-slate-600')],
                [`${activityTick} activity events requested`],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('border-t border-slate-200 pt-5')],
        [
          h.h3(
            [h.Class('mb-2 text-base font-semibold text-slate-800')],
            ['Save recovery'],
          ),
          h.p(
            [h.Class('mb-4 text-sm leading-6 text-slate-600')],
            [
              'Fail the next issue save to test recovery. The editor keeps your draft for retry.',
            ],
          ),
          Button.view(
            {
              type: 'button',
              onClick: Message.ClickedSimulateSaveFailure(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class('button')],
                  ['Fail next save'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
}
