import { clsx } from 'clsx'
import { Array, Option, Record } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Listbox } from '@foldkit/ui'

import {
  ActiveMemberListboxBinding,
  type ApplicationViewBuilder,
  IssueBoardsBinding,
  IssueDetailsBinding,
  IssueListBinding,
  MemberDirectoryBinding,
  NotificationCenterBinding,
  ProjectSettingsBinding,
} from '../composition'
import { Issue, type Member, Project, SavedView, Workspace } from '../domain'
import { toListboxViewInputs } from '../listbox'
import { Message } from '../message'
import type { Model } from '../model'
import {
  ApplicationRoute,
  issueHrefsById,
  issuesRouter,
  maybeIssueId,
  maybeProjectId,
  maybeRouteFilters,
} from '../route'
import { effectiveIssueFilters, maybeConfirmedIssue } from '../selectors'
import { projectOverview, projectTabs } from './project'
import { workspaceSettings } from './settings'

const activeMemberListboxView = (
  activeMemberListbox: Model['activeMemberListbox'],
  activeMemberId: string,
  members: ReadonlyArray<Member.Member>,
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
          h.For(Listbox.buttonId(activeMemberListbox.id)),
          h.Class('sr-only sm:not-sr-only sm:shrink-0'),
        ],
        ['Active member'],
      ),
      h.div(
        [h.Class('w-40')],
        [
          h.block(
            ActiveMemberListboxBinding.embedView({
              slotId: activeMemberListbox.id,
              model: activeMemberListbox,
              viewInputs: toListboxViewInputs({
                value: activeMemberId,
                options: Array.map(members, member => ({
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

export const pageTitle = (
  route: ApplicationRoute,
  savedViews: ReadonlyArray<SavedView.SavedView>,
  projects: ReadonlyArray<Project.Project>,
): string => {
  const projectTitle = (projectId: string) =>
    Option.match(Project.findById(projects, projectId), {
      onNone: () => 'Project not found',
      onSome: project => project.name,
    })

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
      Option.match(SavedView.findById(savedViews, viewId), {
        onNone: () =>
          Option.match(maybeRouteFilters(route), {
            onNone: () => 'Saved view not found',
            onSome: () => 'Filtered issues',
          }),
        onSome: savedView => savedView.name,
      }),
    Issue: () => 'Issue details',
    NotFound: () => 'Page not found',
  })
}

const issueListView = (
  model: Model,
  workspace: Workspace.Workspace,
  issues: ReadonlyArray<Issue.Issue>,
  h: ApplicationViewBuilder,
): Html => {
  const filters = effectiveIssueFilters(model)

  return h.block(
    IssueListBinding.embedView({
      slotId: 'issue-list',
      model: model.issueList,
      viewInputs: {
        filters,
        issueHrefsById: issueHrefsById(model.route, filters, issues),
        issues,
        members: workspace.members,
        projects: workspace.projects,
        maybeActiveIssueId: maybeIssueId(model.route),
      },
    }),
  )
}

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
  model: Model,
  workspace: Workspace.Workspace,
  h: ApplicationViewBuilder,
): Html => {
  const { route } = model

  const projectContent = (
    projectId: string,
    toView: (project: Project.Project) => Html,
  ) =>
    Option.match(Workspace.findProject(workspace, projectId), {
      onNone: () =>
        missingPage(
          'This project is unavailable',
          'This project is not part of the workspace.',
          h,
        ),
      onSome: toView,
    })

  return ApplicationRoute.match<Html>(route, {
    Issues: () => issueListView(model, workspace, workspace.issues, h),
    MyIssues: () =>
      issueListView(
        model,
        workspace,
        Workspace.issuesAssignedTo(workspace, model.activeMemberId),
        h,
      ),
    Project: ({ projectId }) =>
      projectContent(projectId, () =>
        issueListView(
          model,
          workspace,
          Workspace.issuesForProject(workspace, projectId),
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
              IssueBoardsBinding.embedView({
                key: projectId,
                slotId: `project-board-${projectId}`,
                model: board,
                viewInputs: {
                  issueHrefsById: issueHrefsById(
                    model.route,
                    effectiveIssueFilters(model),
                    workspace.issues,
                  ),
                  isMovePending: Issue.MoveState.guards.Moving(
                    model.issueMoveState,
                  ),
                  issues: Workspace.issuesForProject(workspace, projectId),
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
            issueHrefsById: issueHrefsById(
              model.route,
              effectiveIssueFilters(model),
              workspace.issues,
            ),
          },
        }),
      ),
    Settings: () =>
      workspaceSettings(
        model.maybeNotice,
        model.maybeActivityError,
        model.activityRequestCount,
        h,
      ),
    SavedView: ({ viewId }) =>
      Option.match(SavedView.findById(model.savedViews, viewId), {
        onNone: () =>
          Option.match(maybeRouteFilters(route), {
            onNone: () =>
              missingPage(
                'This saved view is unavailable',
                'Save a new set of issue filters to create a view.',
                h,
              ),
            onSome: () => issueListView(model, workspace, workspace.issues, h),
          }),
        onSome: () => issueListView(model, workspace, workspace.issues, h),
      }),
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
  issueMoveState: Issue.MoveState,
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

  return Issue.MoveState.match(issueMoveState, {
    Idle: () => h.empty,
    Moving: () =>
      h.p([h.Class('sr-only'), h.Role('status')], ['Moving issue…']),
    Failed: ({ error }) => failure(error),
  })
}

const workspaceHeader = (
  model: Model,
  workspace: Workspace.Workspace,
  h: ApplicationViewBuilder,
): Html =>
  h.header(
    [
      h.Class(
        'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3',
      ),
    ],
    [
      h.h1(
        [h.Class('text-lg font-semibold text-slate-900')],
        [pageTitle(model.route, model.savedViews, workspace.projects)],
      ),
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          activeMemberListboxView(
            model.activeMemberListbox,
            model.activeMemberId,
            workspace.members,
            h,
          ),
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
  )

const pagePane = (
  model: Model,
  workspace: Workspace.Workspace,
  h: ApplicationViewBuilder,
): Html =>
  ApplicationRoute.matchOrElse<Html>(
    model.route,
    { Issue: () => h.empty },
    () =>
      h.div(
        [
          h.Class(
            clsx('min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain', {
              'hidden xl:block': Option.isSome(maybeIssueId(model.route)),
            }),
          ),
        ],
        [routeContent(model, workspace, h)],
      ),
  )

const issueEditorView = (
  model: Model,
  workspace: Workspace.Workspace,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(maybeIssueId(model.route), {
    onNone: () => h.empty,
    onSome: issueId => {
      const maybeIssueEditor = Option.gen(function* () {
        const detail = yield* Record.get(model.issueDetails, issueId)
        const issue = yield* maybeConfirmedIssue(model, issueId)

        return { detail, issue }
      })

      return Option.match(maybeIssueEditor, {
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
                  ApplicationRoute.matchOrElse<string>(
                    model.route,
                    { Issue: () => 'mx-auto max-w-3xl' },
                    () =>
                      'xl:w-[430px] xl:flex-none xl:border-l xl:border-slate-200',
                  ),
                ),
              ),
            ],
            [
              h.block(
                IssueDetailsBinding.embedView({
                  key: issueId,
                  slotId: issueId,
                  model: detail,
                  viewInputs: {
                    issue,
                    projects: workspace.projects,
                    members: workspace.members,
                    commentAuthorId: model.activeMemberId,
                  },
                }),
              ),
            ],
          ),
      })
    },
  })

export const workspaceView = (
  model: Model,
  workspace: Workspace.Workspace,
  h: ApplicationViewBuilder,
): Html => {
  const { route } = model
  const maybeProject = Option.flatMap(maybeProjectId(route), projectId =>
    Workspace.findProject(workspace, projectId),
  )

  return h.div(
    [h.Class('flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden')],
    [
      workspaceHeader(model, workspace, h),
      Option.match(maybeProject, {
        onNone: () => h.empty,
        onSome: project => projectTabs(project, route, h),
      }),
      issueMoveFeedback(model.issueMoveState, h),
      h.div(
        [
          h.Class(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-slate-200 xl:flex-row',
          ),
        ],
        [pagePane(model, workspace, h), issueEditorView(model, workspace, h)],
      ),
    ],
  )
}
