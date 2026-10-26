import { Array } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { NavigateInternal, ReplaceInternalUrl } from '../command'
import type { Message } from '../message'
import { type Model, appliedIssueFilters } from '../model'
import { ApplicationRoute, pageRoute, routeToPath } from '../route'

export const handleClickedDeleteSavedView = (
  model: typeof Model.Type,
  { viewId }: typeof Message.ClickedDeleteSavedView.Type,
) => {
  const route = pageRoute(model.route)
  const isDeletingDisplayedView =
    ApplicationRoute.guards.SavedView(route) && route.viewId === viewId
  const nextSavedViews = Array.filter(
    model.savedViews,
    saved => saved.id !== viewId,
  )

  if (!isDeletingDisplayedView) {
    return {
      model: modifyFields(model, { savedViews: () => nextSavedViews }),
    }
  }

  const issuesRoute = ApplicationRoute.Issues({
    filters: appliedIssueFilters(model),
  })
  const issuesUrl = routeToPath(issuesRoute)

  if (ApplicationRoute.guards.Issue(model.route)) {
    const issueRoute = ApplicationRoute.Issue({
      issueId: model.route.issueId,
      returnTo: issuesUrl,
    })

    return {
      model: modifyFields(model, {
        route: () => issueRoute,
        savedViews: () => nextSavedViews,
      }),
      commands: [ReplaceInternalUrl({ url: routeToPath(issueRoute) })],
    }
  }

  return {
    model: modifyFields(model, { savedViews: () => nextSavedViews }),
    commands: [NavigateInternal({ url: issuesUrl })],
  }
}
