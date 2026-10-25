import { Record } from 'effect'

import type { Issue, IssueFilters } from './domain'
import { type Model, appliedIssueFilters } from './model'
import {
  ApplicationRoute,
  issueRouter,
  pageRoute,
  routeToPath,
  withRouteFilters,
} from './route'

export const issueHref = (model: typeof Model.Type, issueId: string) => {
  const returnTo = routeToPath(
    withRouteFilters(pageRoute(model.route), appliedIssueFilters(model)),
  )

  return issueRouter(returnTo === '/' ? { issueId } : { issueId, returnTo })
}

export const issueFiltersHref = (
  model: typeof Model.Type,
  filters: typeof IssueFilters.Type,
) => {
  const route = withRouteFilters(pageRoute(model.route), filters)

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
