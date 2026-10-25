import { Array, Option, Record } from 'effect'

import type { Issue, IssueFilters } from './domain'
import type { Model } from './model'
import {
  ApplicationRoute,
  defaultIssueFilters,
  issueRouter,
  resolveIssueCloseRoute,
  routeFilters,
  routeToPath,
  withRouteFilters,
} from './route'

export const backgroundRoute = (route: typeof ApplicationRoute.Type) =>
  ApplicationRoute.guards.Issue(route) ? resolveIssueCloseRoute(route) : route

export const maybeActiveIssueDetailInstance = (model: typeof Model.Type) => {
  const route = model.route

  return ApplicationRoute.guards.Issue(route)
    ? Array.findFirst(
        model.issueDetailInstances,
        instance => instance.issueId === route.issueId,
      )
    : Option.none()
}

export const isActiveBoard = (model: typeof Model.Type, projectId: string) => {
  const route = backgroundRoute(model.route)

  return ApplicationRoute.guards.Board(route) && route.projectId === projectId
}

export const maybeActiveBoardInstance = (model: typeof Model.Type) => {
  const route = backgroundRoute(model.route)

  return ApplicationRoute.guards.Board(route)
    ? Array.findFirst(
        model.boardInstances,
        instance => instance.projectId === route.projectId,
      )
    : Option.none()
}

export const appliedIssueFilters = (model: typeof Model.Type) => {
  const route = backgroundRoute(model.route)

  return Option.getOrElse(routeFilters(route), () => {
    if (ApplicationRoute.guards.SavedView(route)) {
      return Option.match(
        Array.findFirst(model.savedViews, view => view.id === route.viewId),
        {
          onNone: () => defaultIssueFilters,
          onSome: view => view.filters,
        },
      )
    }

    return defaultIssueFilters
  })
}

export const issueHref = (model: typeof Model.Type, issueId: string) => {
  const returnTo = routeToPath(
    withRouteFilters(backgroundRoute(model.route), appliedIssueFilters(model)),
  )

  return issueRouter(returnTo === '/' ? { issueId } : { issueId, returnTo })
}

export const issueFiltersHref = (
  model: typeof Model.Type,
  filters: typeof IssueFilters.Type,
) => {
  const route = withRouteFilters(backgroundRoute(model.route), filters)

  return ApplicationRoute.guards.Issue(model.route)
    ? issueRouter({
        issueId: model.route.issueId,
        returnTo: routeToPath(route),
      })
    : routeToPath(route)
}

export const issueHrefs = (
  model: typeof Model.Type,
  issues: ReadonlyArray<typeof Issue.Type>,
) =>
  Record.fromIterableWith(issues, issue => [
    issue.id,
    issueHref(model, issue.id),
  ])
