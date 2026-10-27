import { Array, Option, Record, pipe } from 'effect'
import { AsyncData } from 'foldkit'

import { maybeDraftSummary } from './issueDetail/draft'
import type { Model } from './model'
import { workspaceWithPendingMove } from './optimistic'
import {
  ApplicationRoute,
  defaultIssueFilters,
  maybeIssueId,
  maybeRouteFilters,
} from './route'

export const visibleWorkspaceAsyncData = (model: typeof Model.Type) =>
  AsyncData.map(model.workspaceAsyncData, workspace =>
    workspaceWithPendingMove(workspace, model.issueMoveState),
  )

export const maybeActiveIssueDetail = (model: typeof Model.Type) =>
  Option.flatMap(maybeIssueId(model.route), issueId =>
    Record.get(model.issueDetails, issueId),
  )

export const maybeActiveIssueBoard = (model: typeof Model.Type) => {
  const { route } = model

  return ApplicationRoute.guards.Board(route)
    ? Record.get(model.issueBoards, route.projectId)
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
  const { route } = model

  return Option.getOrElse(maybeRouteFilters(route), () => {
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
