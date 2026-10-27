import { Record } from 'effect'

import type { Issue, IssueFilters } from './domain'
import type { Model } from './model'
import { routeToPath, withIssue, withRouteFilters } from './route'
import { appliedIssueFilters } from './selection'

export const issueHref = (model: typeof Model.Type, issueId: string) =>
  routeToPath(
    withIssue(
      withRouteFilters(model.route, appliedIssueFilters(model)),
      issueId,
    ),
  )

export const issueFiltersHref = (
  model: typeof Model.Type,
  filters: typeof IssueFilters.Type,
) => routeToPath(withRouteFilters(model.route, filters))

export const issueHrefs = (
  model: typeof Model.Type,
  issues: ReadonlyArray<typeof Issue.Type>,
) =>
  Record.fromIterableWith(issues, issue => [
    issue.id,
    issueHref(model, issue.id),
  ])
