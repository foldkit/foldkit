import { clsx } from 'clsx'
import { Array, Option, Record } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'
import { buttonId } from '@foldkit/ui/listbox'

import {
  ActiveMemberBinding,
  ApplicationComposition,
  type ApplicationViewBuilder,
  CommandPaletteBinding,
  CreateIssueBinding,
  IssueBoardBinding,
  IssueDetailBinding,
  IssueListBinding,
  MemberDirectoryBinding,
  NotificationCenterBinding,
  ProjectSettingsBinding,
} from '../composition'
import type { Issue, Project, Workspace } from '../domain'
import { issueHrefs } from '../issueLinks'
import { listboxViewInputs } from '../listbox'
import { Message } from '../message'
import type { Model } from '../model'
import { IssueMoveState } from '../optimistic'
import {
  ApplicationRoute,
  issuesRouter,
  maybeIssueId,
  maybeProjectId,
  maybeRouteFilters,
} from '../route'
import {
  appliedIssueFilters,
  maybeActiveIssueDetail,
  visibleWorkspaceAsyncData,
} from '../selection'
import { projectOverview, projectTabs } from './project'
import { workspaceSettings } from './settings'
import { sidebarView } from './sidebar'

const maybeVisibleWorkspace = (model: typeof Model.Type) =>
  AsyncData.getData(visibleWorkspaceAsyncData(model))

const memberControl = (
  model: typeof Model.Type,
  workspace: typeof Workspace.Type,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'flex items-center gap-2.5 text-[13px] font-medium text-slate-600',
      ),
    ],
    [
      h.label(
        [
          h.For(buttonId(model.activeMemberListbox.id)),
          h.Class('sr-only sm:not-sr-only sm:shrink-0'),
        ],
        ['Active member'],
      ),
      h.div(
        [h.Class('w-40')],
        [
          h.block(
            ActiveMemberBinding.embedView({
              slotId: model.activeMemberListbox.id,
              model: model.activeMemberListbox,
              viewInputs: listboxViewInputs({
                value: model.activeMemberId,
                options: Array.map(workspace.members, member => ({
                  value: member.id,
                  label: member.name,
                })),
              }),
            }),
          ),
        ],
      ),
    ],
  )

const pageTitle = (
  model: typeof Model.Type,
  workspace: typeof Workspace.Type,
): string => {
  const { route } = model
  const projectTitle = (projectId: string) =>
    Option.match(
      Array.findFirst(workspace.projects, project => project.id === projectId),
      { onNone: () => 'Project not found', onSome: project => project.name },
    )

  return ApplicationRoute.match<string>(route, {
    Issues: () => 'All issues',
    MyIssues: () => 'My issues',
    Project: ({ projectId }) => projectTitle(projectId),
    ProjectOverview: ({ projectId }) => projectTitle(projectId),
    ProjectSettings: ({ projectId }) => projectTitle(projectId),
    Board: ({ projectId }) => projectTitle(projectId),
    People: () => 'People',
    Settings: () => 'Settings',
    SavedView: ({ viewId }) =>
      Option.match(
        Array.findFirst(model.savedViews, savedView => savedView.id === viewId),
        {
          onNone: () =>
            Option.isSome(maybeRouteFilters(route))
              ? 'Filtered issues'
              : 'Saved view not found',
          onSome: savedView => savedView.name,
        },
      ),
    Issue: () => 'Issue details',
    NotFound: () => 'Page not found',
  })
}

const issueListView = (
  model: typeof Model.Type,
  workspace: typeof Workspace.Type,
  issues: ReadonlyArray<typeof Issue.Type>,
  h: ApplicationViewBuilder,
): Html =>
  h.block(
    IssueListBinding.embedView({
      slotId: 'issue-list',
      model: model.issueList,
      viewInputs: {
        filters: appliedIssueFilters(model),
        issueHrefs: issueHrefs(model, issues),
        issues,
        members: workspace.members,
        projects: workspace.projects,
        maybeActiveIssueId: maybeIssueId(model.route),
      },
    }),
  )

const missingPage = (
  title: string,
  description: string,
  h: ApplicationViewBuilder,
): Html =>
  h.section(
    [h.Class('grid min-h-80 place-content-center gap-3 px-8 text-center')],
    [
      h.h2([h.Class('text-lg font-semibold text-slate-700')], [title]),
      h.p([h.Class('text-sm text-slate-500')], [description]),
      h.a(
        [
          h.Href(issuesRouter({})),
          h.Class('mt-2 text-sm font-semibold text-indigo-600'),
        ],
        ['Back to all issues'],
      ),
    ],
  )

const routeContent = (
  model: typeof Model.Type,
  workspace: typeof Workspace.Type,
  h: ApplicationViewBuilder,
): Html => {
  const { route } = model

  const projectContent = (
    projectId: string,
    toView: (project: typeof Project.Type) => Html,
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

  return ApplicationRoute.match<Html>(route, {
    Issues: () => issueListView(model, workspace, workspace.issues, h),
    MyIssues: () =>
      issueListView(
        model,
        workspace,
        Array.filter(workspace.issues, issue =>
          Option.contains(issue.maybeAssigneeId, model.activeMemberId),
        ),
        h,
      ),
    Project: ({ projectId }) =>
      projectContent(projectId, () =>
        issueListView(
          model,
          workspace,
          Array.filter(
            workspace.issues,
            issue => issue.projectId === projectId,
          ),
          h,
        ),
      ),
    ProjectOverview: ({ projectId }) =>
      projectContent(projectId, project =>
        projectOverview(project, workspace, h),
      ),
    ProjectSettings: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.match(Record.get(model.projectSettings, projectId), {
          onNone: () => h.empty,
          onSome: settings =>
            h.block(
              ProjectSettingsBinding.embedView({
                key: projectId,
                slotId: `project-settings-${projectId}`,
                model: settings,
              }),
            ),
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
            h.block(
              IssueBoardBinding.embedView({
                key: projectId,
                slotId: `project-board-${projectId}`,
                model: board,
                viewInputs: {
                  issueHrefs: issueHrefs(model, workspace.issues),
                  isSaving: IssueMoveState.guards.MovingIssue(
                    model.issueMoveState,
                  ),
                  issues: Array.filter(
                    workspace.issues,
                    issue => issue.projectId === projectId,
                  ),
                  members: workspace.members,
                },
              }),
            ),
        }),
      ),
    People: () =>
      h.block(
        MemberDirectoryBinding.embedView({
          slotId: 'member-directory',
          model: model.memberDirectory,
          viewInputs: {
            members: workspace.members,
            issues: workspace.issues,
            issueHrefs: issueHrefs(model, workspace.issues),
          },
        }),
      ),
    Settings: () => workspaceSettings(model, h),
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
              onSome: () =>
                issueListView(model, workspace, workspace.issues, h),
            }),
          onSome: () => issueListView(model, workspace, workspace.issues, h),
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

const issueMoveFeedback = (
  model: typeof Model.Type,
  h: ApplicationViewBuilder,
): Html => {
  const failure = (error: string) =>
    h.div(
      [
        h.Role('alert'),
        h.Class(
          'mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:mx-8',
        ),
      ],
      [
        h.p([], [error]),
        Button.view(
          {
            type: 'button',
            onClick: Message.ClickedRetryMove(),
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class('button')],
                ['Retry changes'],
              ),
          },
          h,
        ),
      ],
    )

  return IssueMoveState.match(model.issueMoveState, {
    Idle: () => h.empty,
    MovingIssue: () =>
      h.p([h.Class('sr-only'), h.Role('status')], ['Moving issue…']),
    FailedMove: ({ error }) => failure(error),
  })
}

const workspaceView = (
  model: typeof Model.Type,
  workspace: typeof Workspace.Type,
  h: ApplicationViewBuilder,
): Html => {
  const { route } = model
  const maybeProject = Option.flatMap(maybeProjectId(route), projectId =>
    Array.findFirst(workspace.projects, project => project.id === projectId),
  )

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
            [pageTitle(model, workspace)],
          ),
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              memberControl(model, workspace, h),
              h.block(
                NotificationCenterBinding.embedView({
                  slotId: 'workspace-notifications',
                  model: model.notificationCenter,
                  viewInputs: {
                    activeMemberId: model.activeMemberId,
                    issues: workspace.issues,
                    members: workspace.members,
                  },
                }),
              ),
            ],
          ),
        ],
      ),
      Option.match(maybeProject, {
        onNone: () => h.empty,
        onSome: project => projectTabs(project, route, h),
      }),
      issueMoveFeedback(model, h),
      h.div(
        [
          h.Class(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-slate-200 xl:flex-row',
          ),
        ],
        [
          ...(!ApplicationRoute.guards.Issue(model.route)
            ? [
                h.div(
                  [
                    h.Class(
                      clsx(
                        'min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain',
                        {
                          'hidden xl:block': Option.isSome(
                            maybeIssueId(model.route),
                          ),
                        },
                      ),
                    ),
                  ],
                  [routeContent(model, workspace, h)],
                ),
              ]
            : []),
          ...(Option.isSome(maybeIssueId(model.route))
            ? [
                Option.match(
                  Option.flatMap(maybeActiveIssueDetail(model), detail =>
                    Option.map(
                      Array.findFirst(
                        workspace.issues,
                        issue => issue.id === detail.issueId,
                      ),
                      issue => ({ detail, issue }),
                    ),
                  ),
                  {
                    onNone: () =>
                      missingPage(
                        'Issue not found',
                        'Choose another issue from the list.',
                        h,
                      ),
                    onSome: ({ detail, issue }) =>
                      h.aside(
                        [
                          h.Class(
                            clsx(
                              'min-h-0 w-full flex-1 overflow-y-auto overscroll-contain bg-slate-50/70',
                              ApplicationRoute.guards.Issue(model.route)
                                ? 'mx-auto max-w-3xl'
                                : 'xl:w-[430px] xl:flex-none xl:border-l xl:border-slate-200',
                            ),
                          ),
                        ],
                        [
                          h.block(
                            IssueDetailBinding.embedView({
                              key: detail.issueId,
                              slotId: detail.issueId,
                              model: detail,
                              viewInputs: {
                                issue,
                                projects: workspace.projects,
                                members: workspace.members,
                                authorId: model.activeMemberId,
                              },
                            }),
                          ),
                        ],
                      ),
                  },
                ),
              ]
            : []),
        ],
      ),
    ],
  )
}

const overlaysView = (
  model: typeof Model.Type,
  h: ApplicationViewBuilder,
): Html => {
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
      h.block(
        CommandPaletteBinding.embedView({
          slotId: 'command-palette',
          model: model.commandPalette,
          viewInputs: paletteInputs,
        }),
      ),
      h.block(
        CreateIssueBinding.embedView({
          slotId: 'create-issue',
          model: model.createIssue,
          viewInputs: { projects },
        }),
      ),
    ],
  )
}

const documentTitle = (model: typeof Model.Type): string =>
  Option.match(maybeVisibleWorkspace(model), {
    onNone: () => 'Northstar | Foldkit workspace',
    onSome: workspace => {
      const issueId = maybeIssueId(model.route)

      if (Option.isSome(issueId)) {
        return Option.match(
          Array.findFirst(
            workspace.issues,
            issue => issue.id === issueId.value,
          ),
          {
            onNone: () => 'Issue not found | Northstar',
            onSome: issue => `${issue.identifier}: ${issue.title} | Northstar`,
          },
        )
      }

      const title = pageTitle(model, workspace)

      return ApplicationRoute.matchOrElse(
        model.route,
        {
          Project: () => `Issues | ${title} | Northstar`,
          ProjectOverview: () => `Overview | ${title} | Northstar`,
          ProjectSettings: () => `Project settings | ${title} | Northstar`,
          Board: () => `Board | ${title} | Northstar`,
        },
        () => `${title} | Northstar`,
      )
    },
  })

export const view = ApplicationComposition.makeView((model, h) => ({
  title: documentTitle(model),
  body: h.div(
    [
      h.Class(
        'flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-sm font-medium text-slate-700 antialiased lg:flex-row',
      ),
    ],
    [
      sidebarView(model, h),
      h.main(
        [h.Class('flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto')],
        [
          h.div(
            [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
            [Option.getOrElse(model.maybeNotice, () => '')],
          ),
          ApplicationRoute.guards.NotFound(model.route)
            ? h.section(
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
            : AsyncData.matchDataSplitEmpty(visibleWorkspaceAsyncData(model), {
                onIdle: () =>
                  h.div(
                    [
                      h.Class(
                        'grid min-h-[60vh] place-content-center px-8 text-sm text-slate-500',
                      ),
                      h.Role('status'),
                    ],
                    ['Loading workspace…'],
                  ),
                onLoading: () =>
                  h.div(
                    [
                      h.Class(
                        'grid min-h-[60vh] place-content-center px-8 text-sm text-slate-500',
                      ),
                      h.Role('status'),
                    ],
                    ['Loading workspace…'],
                  ),
                onFailure: error =>
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
                      h.p(
                        [h.Class('mb-6 text-sm leading-6 text-slate-500')],
                        [error],
                      ),
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
                  ),
                onData: workspace => workspaceView(model, workspace, h),
              }),
        ],
      ),
      overlaysView(model, h),
    ],
  ),
}))
