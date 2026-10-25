import { Option, String } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal, ReplaceFilters } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import {
  nextSorting,
  routeToBrowseFields,
  urlToApplicationRoute,
} from './route'
export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadExternal: ApplicationDefinition.makeNoopStep(),
  CompletedReplaceFilters: ApplicationDefinition.makeNoopStep(),

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

  ChangedUrl: ApplicationDefinition.makeFieldsStep.fromMessage(({ url }) => {
    const nextRoute = urlToApplicationRoute(url)

    return { route: () => nextRoute }
  }),

  ChangedSearchInput: ApplicationDefinition.makeCommandsStep(
    (model, { value }) => {
      const fields = routeToBrowseFields(model.route)

      return [
        ReplaceFilters({
          ...fields,
          search: Option.liftPredicate(value, String.isNonEmpty),
        }),
      ]
    },
  ),

  ClickedColumnHeader: ApplicationDefinition.makeCommandsStep(
    (model, { column }) => {
      const fields = routeToBrowseFields(model.route)

      return [
        ReplaceFilters({
          ...fields,
          sorting: nextSorting(fields.sorting, column),
        }),
      ]
    },
  ),
})
