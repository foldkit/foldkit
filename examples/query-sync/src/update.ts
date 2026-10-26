import { Option, String } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal, ReplaceFilters } from './command'
import { ApplicationComposition } from './composition'
import { makeCommandsStep, makeFieldsStep, makeNoopStep } from './definition'
import {
  nextSorting,
  routeToBrowseFields,
  urlToApplicationRoute,
} from './route'
export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),
  CompletedReplaceFilters: makeNoopStep(),

  ClickedLink: (model, { request }) =>
    UrlRequest.match(request, {
      Internal: ({ url }) => ({
        model,
        commands: [NavigateInternal({ url: urlToString(url) })],
      }),
      External: ({ href }) => ({
        model,
        commands: [LoadExternal({ href })],
      }),
    }),

  ChangedUrl: makeFieldsStep.fromMessage(({ url }) => {
    const nextRoute = urlToApplicationRoute(url)

    return { route: () => nextRoute }
  }),

  ChangedSearchInput: makeCommandsStep((model, { value }) => {
    const fields = routeToBrowseFields(model.route)

    return [
      ReplaceFilters({
        ...fields,
        search: Option.liftPredicate(value, String.isNonEmpty),
      }),
    ]
  }),

  ClickedColumnHeader: makeCommandsStep((model, { column }) => {
    const fields = routeToBrowseFields(model.route)

    return [
      ReplaceFilters({
        ...fields,
        sorting: nextSorting(fields.sorting, column),
      }),
    ]
  }),
})
