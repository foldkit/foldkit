import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import type { ApplicationViewBuilder } from '../composition'
import type { Project, WorkspaceSnapshot } from '../domain'
import {
  ApplicationRoute,
  boardRouter,
  projectOverviewRouter,
  projectRouter,
  projectSettingsRouter,
} from '../route'
import { navigationLink } from './navigation'

export const projectTabs = (
  project: typeof Project.Type,
  route: typeof ApplicationRoute.Type,
  h: ApplicationViewBuilder,
): Html =>
  h.nav(
    [
      h.AriaLabel('Project navigation'),
      h.Class('flex flex-wrap gap-1 border-b border-slate-200 px-2 pb-3'),
    ],
    [
      navigationLink(
        projectOverviewRouter({ projectId: project.id }),
        'Overview',
        ApplicationRoute.guards.ProjectOverview(route),
        h,
      ),
      navigationLink(
        projectRouter({ projectId: project.id }),
        'Issues',
        ApplicationRoute.guards.Project(route),
        h,
      ),
      navigationLink(
        boardRouter({ projectId: project.id }),
        'Board',
        ApplicationRoute.guards.Board(route),
        h,
      ),
      navigationLink(
        projectSettingsRouter({ projectId: project.id }),
        'Project settings',
        ApplicationRoute.guards.ProjectSettings(route),
        h,
      ),
    ],
  )

export const projectOverview = (
  project: typeof Project.Type,
  snapshot: typeof WorkspaceSnapshot.Type,
  h: ApplicationViewBuilder,
): Html => {
  const issues = Array.filter(
    snapshot.issues,
    issue => issue.projectId === project.id,
  )
  const completed = Array.filter(issues, issue => issue.status === 'Done')
  const inProgress = Array.filter(
    issues,
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
          h.div(
            [h.Class('py-4 sm:px-5 sm:first:pl-0')],
            [
              h.dt(
                [h.Class('text-sm font-medium text-slate-600')],
                ['Total issues'],
              ),
              h.dd(
                [h.Class('mt-1 text-xl font-semibold text-slate-800')],
                [`${issues.length}`],
              ),
            ],
          ),
          h.div(
            [h.Class('py-4 sm:px-5')],
            [
              h.dt(
                [h.Class('text-sm font-medium text-slate-600')],
                ['In progress'],
              ),
              h.dd(
                [h.Class('mt-1 text-xl font-semibold text-slate-800')],
                [`${inProgress.length}`],
              ),
            ],
          ),
          h.div(
            [h.Class('py-4 sm:px-5')],
            [
              h.dt(
                [h.Class('text-sm font-medium text-slate-600')],
                ['Completed'],
              ),
              h.dd(
                [h.Class('mt-1 text-xl font-semibold text-slate-800')],
                [`${completed.length}`],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
