import { Array, Match, Option, Order } from 'effect'

import type { Issue, IssueFilters } from '../domain'

const priorityOrder = Order.mapInput(Order.Number, (issue: Issue) =>
  Match.value(issue.priority).pipe(
    Match.when('High', () => 0),
    Match.when('Medium', () => 1),
    Match.when('Low', () => 2),
    Match.exhaustive,
  ),
)

export const filterAndSortIssues = (
  filters: IssueFilters,
  issues: ReadonlyArray<Issue>,
) => {
  const query = filters.query.toLowerCase().trim()

  const filtered = Array.filter(
    issues,
    issue =>
      `${issue.identifier} ${issue.title}`.toLowerCase().includes(query) &&
      Option.match(filters.maybeStatus, {
        onNone: () => true,
        onSome: status => issue.status === status,
      }),
  )

  return Array.sort(
    filtered,
    filters.sort === 'Priority'
      ? priorityOrder
      : Order.mapInput(Order.String, issue => issue.identifier),
  )
}
