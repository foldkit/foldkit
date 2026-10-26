import { clsx } from 'clsx'
import { Array, Option } from 'effect'
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
import type { Issue, Project, WorkspaceSnapshot } from '../domain'
import { listboxViewInputs } from '../listbox'
import { Message } from '../message'
import {
  IssueMoveState,
  type Model,
  appliedIssueFilters,
  maybeActiveBoardInstance,
  maybeActiveIssueDetailInstance,
} from '../model'
import { issueHrefs } from '../navigation'
import {
  ApplicationRoute,
  issuesRouter,
  maybeProjectId,
  pageRoute,
  routeFilters,
} from '../route'
import { projectOverview, projectTabs } from './project'
import { workspaceSettings } from './settings'
import { sidebarView } from './sidebar'

const maybeSnapshot = (model: typeof Model.Type) =>
  AsyncData.getData(model.workspaceAsyncData)

const memberControl = (
  model: typeof Model.Type,
  snapshot: typeof WorkspaceSnapshot.Type,
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
                options: Array.map(snapshot.members, member => ({
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
  snapshot: typeof WorkspaceSnapshot.Type,
): string => {
  const route = pageRoute(model.route)
  const projectTitle = (projectId: string) =>
    Option.match(
      Array.findFirst(snapshot.projects, project => project.id === projectId),
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
            Option.isSome(routeFilters(route))
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
  snapshot: typeof WorkspaceSnapshot.Type,
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
        members: snapshot.members,
        projects: snapshot.projects,
        maybeActiveIssueId: ApplicationRoute.guards.Issue(model.route)
          ? Option.some(model.route.issueId)
          : Option.none(),
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
  snapshot: typeof WorkspaceSnapshot.Type,
  h: ApplicationViewBuilder,
): Html => {
  const route = pageRoute(model.route)

  const projectContent = (
    projectId: string,
    toView: (project: typeof Project.Type) => Html,
  ) =>
    Option.match(
      Array.findFirst(snapshot.projects, project => project.id === projectId),
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
    Issues: () => issueListView(model, snapshot, snapshot.issues, h),
    MyIssues: () =>
      issueListView(
        model,
        snapshot,
        Array.filter(snapshot.issues, issue =>
          Option.contains(issue.maybeAssigneeId, model.activeMemberId),
        ),
        h,
      ),
    Project: ({ projectId }) =>
      projectContent(projectId, () =>
        issueListView(
          model,
          snapshot,
          Array.filter(snapshot.issues, issue => issue.projectId === projectId),
          h,
        ),
      ),
    ProjectOverview: ({ projectId }) =>
      projectContent(projectId, project =>
        projectOverview(project, snapshot, h),
      ),
    ProjectSettings: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.match(
          Array.findFirst(
            model.projectSettingsInstances,
            instance => instance.projectId === projectId,
          ),
          {
            onNone: () => h.empty,
            onSome: instance =>
              h.block(
                ProjectSettingsBinding.embedView({
                  key: projectId,
                  slotId: `project-settings-${projectId}`,
                  model: instance.model,
                }),
              ),
          },
        ),
      ),
    Board: ({ projectId }) =>
      projectContent(projectId, () =>
        Option.match(maybeActiveBoardInstance(model), {
          onNone: () =>
            h.p(
              [h.Class('p-8 text-sm text-slate-500'), h.Role('status')],
              ['Loading board…'],
            ),
          onSome: instance =>
            h.block(
              IssueBoardBinding.embedView({
                key: projectId,
                slotId: `project-board-${projectId}`,
                model: instance.model,
                viewInputs: {
                  issueHrefs: issueHrefs(model, snapshot.issues),
                  isSaving: IssueMoveState.guards.MovingIssue(
                    model.issueMoveState,
                  ),
                  issues: Array.filter(
                    snapshot.issues,
                    issue => issue.projectId === projectId,
                  ),
                  members: snapshot.members,
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
            members: snapshot.members,
            issues: snapshot.issues,
            issueHrefs: issueHrefs(model, snapshot.issues),
          },
        }),
      ),
    Settings: () => workspaceSettings(model, h),
    SavedView: ({ viewId }) =>
      Option.match(
        Array.findFirst(model.savedViews, savedView => savedView.id === viewId),
        {
          onNone: () =>
            Option.match(routeFilters(route), {
              onNone: () =>
                missingPage(
                  'This saved view is unavailable',
                  'Save a new set of issue filters to create a view.',
                  h,
                ),
              onSome: () => issueListView(model, snapshot, snapshot.issues, h),
            }),
          onSome: () => issueListView(model, snapshot, snapshot.issues, h),
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
  snapshot: typeof WorkspaceSnapshot.Type,
  h: ApplicationViewBuilder,
): Html => {
  const route = pageRoute(model.route)
  const maybeProject = Option.flatMap(maybeProjectId(route), projectId =>
    Array.findFirst(snapshot.projects, project => project.id === projectId),
  )

  return h.div(
    [h.Class('min-w-0 flex-1')],
    [
      h.header(
        [
          h.Class(
            'flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-3',
          ),
        ],
        [
          h.h1(
            [h.Class('text-lg font-semibold text-slate-900')],
            [pageTitle(model, snapshot)],
          ),
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              memberControl(model, snapshot, h),
              h.block(
                NotificationCenterBinding.embedView({
                  slotId: 'workspace-notifications',
                  model: model.notificationCenter,
                  viewInputs: {
                    activeMemberId: model.activeMemberId,
                    issues: snapshot.issues,
                    members: snapshot.members,
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
            'flex min-h-[calc(100vh-64px)] min-w-0 flex-col border-t border-slate-200 xl:flex-row',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                clsx('min-w-0 flex-1', {
                  'hidden xl:block': ApplicationRoute.guards.Issue(model.route),
                }),
              ),
            ],
            [routeContent(model, snapshot, h)],
          ),
          ...(ApplicationRoute.guards.Issue(model.route)
            ? [
                Option.match(
                  Option.flatMap(
                    maybeActiveIssueDetailInstance(model),
                    instance =>
                      Option.map(
                        Array.findFirst(
                          snapshot.issues,
                          issue => issue.id === instance.issueId,
                        ),
                        issue => ({ instance, issue }),
                      ),
                  ),
                  {
                    onNone: () =>
                      missingPage(
                        'Issue not found',
                        'Choose another issue from the list.',
                        h,
                      ),
                    onSome: ({ instance, issue }) =>
                      h.aside(
                        [
                          h.Class(
                            'w-full shrink-0 bg-slate-50/70 xl:w-[430px] xl:border-l xl:border-slate-200',
                          ),
                        ],
                        [
                          h.block(
                            IssueDetailBinding.embedView({
                              key: instance.issueId,
                              slotId: instance.issueId,
                              model: instance.model,
                              viewInputs: {
                                issue,
                                projects: snapshot.projects,
                                members: snapshot.members,
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
  const paletteInputs = Option.match(maybeSnapshot(model), {
    onNone: () => ({ issues: [], projects: [] }),
    onSome: snapshot => ({
      issues: snapshot.issues,
      projects: snapshot.projects,
    }),
  })
  const projects = Option.match(maybeSnapshot(model), {
    onNone: () => [],
    onSome: snapshot => snapshot.projects,
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
  Option.match(maybeSnapshot(model), {
    onNone: () => 'Northstar | Foldkit workspace',
    onSome: snapshot => {
      if (ApplicationRoute.guards.Issue(model.route)) {
        const issueId = model.route.issueId

        return Option.match(
          Array.findFirst(snapshot.issues, issue => issue.id === issueId),
          {
            onNone: () => 'Issue not found | Northstar',
            onSome: issue => `${issue.identifier}: ${issue.title} | Northstar`,
          },
        )
      }

      const title = pageTitle(model, snapshot)

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
        'min-h-screen bg-slate-50 font-sans text-sm font-medium text-slate-700 antialiased lg:flex',
      ),
    ],
    [
      sidebarView(model, h),
      h.main(
        [h.Class('min-w-0 flex-1')],
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
            : AsyncData.matchDataSplitEmpty(model.workspaceAsyncData, {
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
                onData: snapshot => workspaceView(model, snapshot, h),
              }),
        ],
      ),
      overlaysView(model, h),
    ],
  ),
}))
