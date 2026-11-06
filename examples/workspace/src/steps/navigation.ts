import { makeCommandsStep } from '../block'
import { NavigateInternal } from '../command'
import { type Issue } from '../domain'
import {
  ApplicationRoute,
  isPageRoute,
  issueHref,
  issuesRouter,
  routeHrefWithIssueFilters,
  routeToPath,
  withoutIssueId,
} from '../route'
import { effectiveIssueFilters } from '../selectors'

export const openIssue = (issueId: string) =>
  makeCommandsStep(model => [
    NavigateInternal({
      url: issueHref(model.route, effectiveIssueFilters(model), issueId),
    }),
  ])

export const closeIssue = makeCommandsStep(model => {
  const { route } = model

  if (ApplicationRoute.guards.Issue(route)) {
    return [NavigateInternal({ url: issuesRouter({}) })]
  }

  if (!isPageRoute(route)) {
    return []
  }

  return [NavigateInternal({ url: routeToPath(withoutIssueId(route)) })]
})

export const changeIssueFilters = (
  change: (filters: Issue.Filters) => Issue.Filters,
) =>
  makeCommandsStep(model => [
    NavigateInternal({
      url: routeHrefWithIssueFilters(
        model.route,
        change(effectiveIssueFilters(model)),
      ),
    }),
  ])
