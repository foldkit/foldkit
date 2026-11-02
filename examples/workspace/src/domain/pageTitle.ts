import { Array, Option } from 'effect'

import { ApplicationRoute, maybeIssueId, maybeRouteFilters } from '../route'
import type { SavedView, Workspace } from './domain'

export const pageTitle = (
  route: ApplicationRoute,
  savedViews: ReadonlyArray<SavedView>,
  workspace: Workspace,
): string => {
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
        Array.findFirst(savedViews, savedView => savedView.id === viewId),
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

export const documentTitle = (
  route: ApplicationRoute,
  savedViews: ReadonlyArray<SavedView>,
  maybeWorkspace: Option.Option<Workspace>,
): string =>
  Option.match(maybeWorkspace, {
    onNone: () => 'Northstar | Foldkit workspace',
    onSome: workspace => {
      const issueId = maybeIssueId(route)

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

      const title = pageTitle(route, savedViews, workspace)

      return ApplicationRoute.matchOrElse(
        route,
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
