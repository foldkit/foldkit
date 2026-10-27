import { Array, Option, Record, pipe } from 'effect'

import { maybeDraftSummary } from './issueDetail/draft'
import type { Model } from './model'
import {
  ApplicationRoute,
  defaultIssueFilters,
  routeFilters,
  routeForPageContent,
} from './route'

export const maybeActiveIssueDetail = (model: typeof Model.Type) =>
  ApplicationRoute.guards.Issue(model.route)
    ? Record.get(model.issueDetails, model.route.issueId)
    : Option.none()

export const maybeActiveBoard = (model: typeof Model.Type) => {
  const route = routeForPageContent(model.route)

  return ApplicationRoute.guards.Board(route)
    ? Record.get(model.boards, route.projectId)
    : Option.none()
}

export const unsavedIssueDrafts = (model: typeof Model.Type) =>
  pipe(
    model.issueDetails,
    Record.values,
    Array.map(maybeDraftSummary),
    Array.getSomes,
  )

export const appliedIssueFilters = (model: typeof Model.Type) => {
  const route = routeForPageContent(model.route)

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
