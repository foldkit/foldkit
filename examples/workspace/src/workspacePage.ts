import { clsx } from 'clsx'
import { Array, Effect, Option, Record } from 'effect'
import { AsyncData, Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button, Nav } from '@foldkit/ui'

import type { Issue, Project, SavedView, Workspace } from './domain/domain'
import { missingPage } from './domain/missingPage'
import { navigationLink } from './domain/navigationLink'
import { pageTitle } from './domain/pageTitle'
import {
  ApplicationRoute,
  boardRouter,
  maybeIssueId,
  maybeProjectId,
  maybeRouteFilters,
  routeToPath,
} from './route'

const Message = defineMessageUnion({ ClickedRetryLoad: {} })
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({ RequestedRetryLoad: {} })

type ViewInput = Readonly<{
  route: ApplicationRoute
  workspaceAsyncData: AsyncData.AsyncData<Workspace, string>
  savedViews: ReadonlyArray<SavedView>
  activeMemberId: string
  maybeNotice: Option.Option<string>
  memberSwitcherView: (workspace: Workspace) => Html
  notificationCenterView: (workspace: Workspace) => Html
  issueMoveView: () => Html
  issueListView: (workspace: Workspace, issues: ReadonlyArray<Issue>) => Html
  maybeIssueBoardView: (
    workspace: Workspace,
    projectId: string,
    issues: ReadonlyArray<Issue>,
  ) => Option.Option<Html>
  maybeProjectSettingsView: (projectId: string) => Option.Option<Html>
  memberDirectoryView: (workspace: Workspace) => Html
  workspaceSettingsView: () => Html
  issuePaneView: (workspace: Workspace, issueId: string) => Html
}>

export class WorkspacePage extends Block<WorkspacePage, void, ViewInput>()(
  'WorkspacePage',
  { Message, OutMessage },
) {}

type WorkspacePageViewBuilder = HtmlBuilder<Message>

const projectTabs = (
  project: Project,
  route: ApplicationRoute,
  h: WorkspacePageViewBuilder,
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
  h: WorkspacePageViewBuilder,
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
  h: WorkspacePageViewBuilder,
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

const routeContent = (
  input: ViewInput,
  workspace: Workspace,
  h: WorkspacePageViewBuilder,
): Html => {
  const { route } = input

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
    Issues: () => input.issueListView(workspace, workspace.issues),
    MyIssues: () =>
      input.issueListView(
        workspace,
        Array.filter(workspace.issues, issue =>
          Option.contains(issue.maybeAssigneeId, input.activeMemberId),
        ),
      ),
    Project: ({ projectId }) =>
      projectContent(projectId, () =>
        input.issueListView(workspace, projectIssues(projectId)),
      ),
    ProjectOverview: ({ projectId }) =>
      projectContent(projectId, project =>
        projectOverview(project, workspace, h),
      ),
    ProjectSettings: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.getOrElse(
          input.maybeProjectSettingsView(projectId),
          () => h.empty,
        ),
      ),
    Board: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.getOrElse(
          input.maybeIssueBoardView(
            workspace,
            projectId,
            projectIssues(projectId),
          ),
          () =>
            h.p(
              [h.Class('p-8 text-sm text-slate-500'), h.Role('status')],
              ['Loading board…'],
            ),
        ),
      ),
    People: () => input.memberDirectoryView(workspace),
    Settings: input.workspaceSettingsView,
    SavedView: ({ viewId }) =>
      Option.match(
        Array.findFirst(input.savedViews, savedView => savedView.id === viewId),
        {
          onNone: () =>
            Option.match(maybeRouteFilters(route), {
              onNone: () =>
                missingPage(
                  'This saved view is unavailable',
                  'Save a new set of issue filters to create a view.',
                  h,
                ),
              onSome: () => input.issueListView(workspace, workspace.issues),
            }),
          onSome: () => input.issueListView(workspace, workspace.issues),
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
  input: ViewInput,
  workspace: Workspace,
  h: WorkspacePageViewBuilder,
): Html => {
  const { route } = input
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
            [pageTitle(route, input.savedViews, workspace)],
          ),
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              input.memberSwitcherView(workspace),
              input.notificationCenterView(workspace),
            ],
          ),
        ],
      ),
      Option.match(maybeProject, {
        onNone: () => h.empty,
        onSome: project => projectTabs(project, route, h),
      }),
      input.issueMoveView(),
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
                  [routeContent(input, workspace, h)],
                ),
              ]
            : []),
          ...Option.match(maybeSelectedIssueId, {
            onNone: () => [],
            onSome: issueId => [input.issuePaneView(workspace, issueId)],
          }),
        ],
      ),
    ],
  )
}

const workspaceLoadingView = (h: WorkspacePageViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'grid min-h-[60vh] place-content-center px-8 text-sm text-slate-500',
      ),
      h.Role('status'),
    ],
    ['Loading workspace…'],
  )

const workspaceFailureView = (
  error: string,
  h: WorkspacePageViewBuilder,
): Html =>
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

const notFoundView = (h: WorkspacePageViewBuilder): Html =>
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

export const WorkspacePageLive = WorkspacePage.make(
  Effect.fn(function* () {
    return {
      update: {
        ClickedRetryLoad: model => ({
          model,
          outMessage: OutMessage.RequestedRetryLoad(),
        }),
      },

      view: (_model, h, input) =>
        h.main(
          [h.Class('flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto')],
          [
            h.div(
              [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
              [Option.getOrElse(input.maybeNotice, () => '')],
            ),
            ApplicationRoute.guards.NotFound(input.route)
              ? notFoundView(h)
              : AsyncData.matchDataSplitEmpty(input.workspaceAsyncData, {
                  onIdle: () => workspaceLoadingView(h),
                  onLoading: () => workspaceLoadingView(h),
                  onFailure: error => workspaceFailureView(error, h),
                  onData: workspace => workspaceView(input, workspace, h),
                }),
          ],
        ),
    }
  }),
)
