import { Option, String } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal, ReplaceFilters } from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import {
  nextSorting,
  routeToBrowseFields,
  urlToApplicationRoute,
} from './route'
export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedReplaceFilters: () => ({ model }),

    ClickedLink: ({ request }) =>
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

    ChangedUrl: ({ url }) => {
      const nextRoute = urlToApplicationRoute(url)

      return { model: modifyFields(model, { route: () => nextRoute }) }
    },

    ChangedSearchInput: ({ value }) => {
      const fields = routeToBrowseFields(model.route)

      return {
        model,
        commands: [
          ReplaceFilters({
            ...fields,
            search: Option.liftPredicate(value, String.isNonEmpty),
          }),
        ],
      }
    },

    ClickedColumnHeader: ({ column }) => {
      const fields = routeToBrowseFields(model.route)

      return {
        model,
        commands: [
          ReplaceFilters({
            ...fields,
            sorting: nextSorting(fields.sorting, column),
          }),
        ],
      }
    },
  }),
)
