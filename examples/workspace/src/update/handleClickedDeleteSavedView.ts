import { Array } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { NavigateInternal, ReplaceInternalUrl } from '../command'
import type { Message } from '../message'
import type { Model } from '../model'
import { ApplicationRoute, routeForPageContent, routeToPath } from '../route'
import { appliedIssueFilters } from '../selection'

export const handleClickedDeleteSavedView = (
  model: typeof Model.Type,
  { viewId }: typeof Message.ClickedDeleteSavedView.Type,
) => {
  const route = routeForPageContent(model.route)
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
      returnTo: issuesRoute,
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
