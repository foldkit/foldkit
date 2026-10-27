import { Record } from 'effect'

import type { Issue, IssueFilters } from './domain'
import { type Model, appliedIssueFilters } from './model'
import {
  ApplicationRoute,
  issueRouter,
  routeForPageContent,
  routeToPath,
  withRouteFilters,
} from './route'

export const issueHref = (model: typeof Model.Type, issueId: string) => {
  const route = routeForPageContent(model.route)
  const returnTo = ApplicationRoute.guards.NotFound(route)
    ? ApplicationRoute.Issues({ filters: appliedIssueFilters(model) })
    : withRouteFilters(route, appliedIssueFilters(model))

  return issueRouter(
    routeToPath(returnTo) === '/' ? { issueId } : { issueId, returnTo },
  )
}

export const issueFiltersHref = (
  model: typeof Model.Type,
  filters: typeof IssueFilters.Type,
) => {
  const route = routeForPageContent(model.route)

  if (ApplicationRoute.guards.NotFound(route)) {
    return routeToPath(route)
  }

  const nextRoute = withRouteFilters(route, filters)

  return ApplicationRoute.guards.Issue(model.route)
    ? issueRouter({
        issueId: model.route.issueId,
        returnTo: nextRoute,
      })
    : routeToPath(nextRoute)
}

export const issueHrefs = (
  model: typeof Model.Type,
  issues: ReadonlyArray<typeof Issue.Type>,
) =>
  Record.fromIterableWith(issues, issue => [
    issue.id,
    issueHref(model, issue.id),
  ])
