import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, PeoplePageBinding } from './composition'
import { Message, type NavigationShortcut } from './message'
import { Model } from './model'
import {
  ApplicationRoute,
  filesIndexRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
  urlToApplicationRoute,
} from './route'

const navigationUrlByShortcut: Readonly<
  Record<NavigationShortcut, () => string>
> = {
  GH: homeRouter,
  GP: () => peopleRouter({ searchText: Option.none() }),
  GF: filesIndexRouter,
  GN: nestedRouter,
}

const setRoute = (nextRoute: ApplicationRoute) => (model: Model) => ({
  model: modifyFields(model, { route: () => nextRoute }),
})

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

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

      const routeSteps = Match.value(nextRoute).pipe(
        Match.tag('People', peopleRoute => [
          PeoplePageBinding.informRouteChanged(peopleRoute),
        ]),
        Match.orElse(() => []),
      )

      return Update.combine(model, [setRoute(nextRoute), ...routeSteps])
    },

    EnteredNavigationShortcut: ({ shortcut }) => {
      const url = navigationUrlByShortcut[shortcut]()

      return { model, commands: [NavigateInternal({ url })] }
    },
  }),
)
