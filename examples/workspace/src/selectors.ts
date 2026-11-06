import { Array, Option, Record, pipe } from 'effect'
import { AsyncData } from 'foldkit'

import { maybeUnsavedChangesSummary } from './blocks/issueDetail'
import { SavedView, Workspace } from './domain'
import type { Model } from './model'
import {
  ApplicationRoute,
  defaultIssueFilters,
  maybeIssueId,
  maybeRouteFilters,
} from './route'

export const visibleWorkspaceAsyncData = (model: Model) =>
  AsyncData.map(model.workspaceAsyncData, workspace =>
    Workspace.withPendingMove(workspace, model.issueMoveState),
  )

export const maybeConfirmedIssue = (model: Model, issueId: string) =>
  pipe(
    AsyncData.getData(model.workspaceAsyncData),
    Option.flatMap(workspace => Workspace.findIssue(workspace, issueId)),
  )

export const maybeWorkspaceProject = (model: Model, projectId: string) =>
  pipe(
    AsyncData.getData(model.workspaceAsyncData),
    Option.flatMap(workspace => Workspace.findProject(workspace, projectId)),
  )

export const maybeActiveIssueDetail = (model: Model) =>
  Option.flatMap(maybeIssueId(model.route), issueId =>
    Record.get(model.issueDetails, issueId),
  )

export const maybeActiveIssueBoard = (model: Model) => {
  const { route } = model

  return ApplicationRoute.guards.Board(route)
    ? Record.get(model.issueBoards, route.projectId)
    : Option.none()
}

export const unsavedIssueSummaries = (model: Model) =>
  pipe(
    model.issueDetails,
    Record.values,
    Array.flatMap(detail =>
      pipe(
        maybeConfirmedIssue(model, detail.issueId),
        Option.flatMap(issue => maybeUnsavedChangesSummary(detail, issue)),
        Option.toArray,
      ),
    ),
  )

export const effectiveIssueFilters = (model: Model) => {
  const { route } = model

  const maybeFilters = maybeRouteFilters(route)

  if (Option.isSome(maybeFilters)) {
    return maybeFilters.value
  }

  if (ApplicationRoute.guards.SavedView(route)) {
    return Option.match(SavedView.findById(model.savedViews, route.viewId), {
      onNone: () => defaultIssueFilters,
      onSome: view => view.filters,
    })
  }

  return defaultIssueFilters
}
