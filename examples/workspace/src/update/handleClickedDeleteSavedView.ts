import { Array, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { NavigateInternal, ReplaceInternalUrl } from '../command'
import type { ClickedDeleteSavedView } from '../message'
import type { Model } from '../model'
import { ApplicationRoute, maybeIssueId, routeToPath } from '../route'
import { appliedIssueFilters } from '../selection'

export const handleClickedDeleteSavedView = (
  model: Model,
  { viewId }: ClickedDeleteSavedView,
) => {
  const { route } = model

  const isDeletingDisplayedView =
    ApplicationRoute.guards.SavedView(route) && route.viewId === viewId

  const nextSavedViews = Array.filter(
    model.savedViews,
    savedView => savedView.id !== viewId,
  )

  if (!isDeletingDisplayedView) {
    return {
      model: modifyFields(model, { savedViews: () => nextSavedViews }),
    }
  }

  const issuesRoute = ApplicationRoute.Issues({
    filters: appliedIssueFilters(model),
  })
  const maybeSelectedIssueId = maybeIssueId(model.route)

  if (Option.isNone(maybeSelectedIssueId)) {
    return {
      model: modifyFields(model, { savedViews: () => nextSavedViews }),
      commands: [NavigateInternal({ url: routeToPath(issuesRoute) })],
    }
  }

  const nextRoute = ApplicationRoute.Issues({
    filters: appliedIssueFilters(model),
    issueId: maybeSelectedIssueId.value,
  })

  return {
    model: modifyFields(model, {
      route: () => nextRoute,
      savedViews: () => nextSavedViews,
    }),
    commands: [ReplaceInternalUrl({ url: routeToPath(nextRoute) })],
  }
}
