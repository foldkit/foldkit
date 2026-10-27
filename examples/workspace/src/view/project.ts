import { Array, Record } from 'effect'
import type { Html } from 'foldkit/html'

import { Nav } from '@foldkit/ui'

import type { ApplicationViewBuilder } from '../composition'
import type { Project, Workspace } from '../domain'
import { ApplicationRoute, boardRouter, routeToPath } from '../route'
import { navigationLink } from './navigationLink'

export const projectTabs = (
  project: typeof Project.Type,
  route: typeof ApplicationRoute.Type,
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

export const projectOverview = (
  project: typeof Project.Type,
  workspace: typeof Workspace.Type,
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
          h.div(
            [h.Class('py-4 sm:px-5 sm:first:pl-0')],
            [
              h.dt(
                [h.Class('text-sm font-medium text-slate-600')],
                ['Total issues'],
              ),
              h.dd(
                [h.Class('mt-1 text-xl font-semibold text-slate-800')],
                [`${projectIssues.length}`],
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
                [`${inProgressIssues.length}`],
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
                [`${completedIssues.length}`],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
