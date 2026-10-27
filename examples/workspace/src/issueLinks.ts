import { Record } from 'effect'

import type { Issue, IssueFilters } from './domain'
import type { Model } from './model'
import {
  isPageRoute,
  issueRouter,
  routeToPath,
  withIssueId,
  withRouteFilters,
} from './route'
import { appliedIssueFilters } from './selection'

export const issueHref = (model: typeof Model.Type, issueId: string) => {
  const { route } = model

  if (!isPageRoute(route)) {
    return issueRouter({ issueId })
  }

  return routeToPath(
    withIssueId(withRouteFilters(route, appliedIssueFilters(model)), issueId),
  )
}

export const issueFiltersHref = (
  model: typeof Model.Type,
  filters: typeof IssueFilters.Type,
) => {
  const { route } = model

  return isPageRoute(route)
    ? routeToPath(withRouteFilters(route, filters))
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
