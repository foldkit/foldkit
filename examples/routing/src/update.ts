import { Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, PeoplePageBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { type NavigationShortcut } from './message'
import {
  ApplicationRoute,
  filesIndexRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
  urlToApplicationRoute,
} from './route'

const navigationUrlByShortcut: Readonly<
  Record<typeof NavigationShortcut.Type, () => string>
> = {
  GH: homeRouter,
  GP: () => peopleRouter({ searchText: Option.none() }),
  GF: filesIndexRouter,
  GN: nestedRouter,
}

const setRoute = (nextRoute: typeof ApplicationRoute.Type) =>
  ApplicationDefinition.makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModel = ApplicationDefinition.makeNoopStep()

type InformPeopleRouteStep =
  | typeof keepModel
  | ReturnType<typeof PeoplePageBinding.informRouteChanged>

export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadExternal: ApplicationDefinition.makeNoopStep(),

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

  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)

    const transition = Transition.make(model.route, nextRoute)
    const informPeopleRoute = Transition.matchOrElse<InformPeopleRouteStep>()(
      transition,
      'People',
      {
        Entered: peopleRoute =>
          PeoplePageBinding.informRouteChanged({ route: peopleRoute }),
        Stayed: ({ nextRoute }) =>
          PeoplePageBinding.informRouteChanged({ route: nextRoute }),
      },
      () => keepModel,
    )

    return Update.combineSteps(model, [setRoute(nextRoute), informPeopleRoute])
  },

  EnteredNavigationShortcut: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ shortcut }) => {
      const url = navigationUrlByShortcut[shortcut]()

      return [NavigateInternal({ url })]
    },
  ),
})
