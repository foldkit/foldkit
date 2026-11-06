import { Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { toString as urlToString } from 'foldkit/url'

import { makeCommandsStep, makeFieldsStep, makeNoopStep } from './block'
import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, PeoplePageBinding } from './composition'
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
  Record<NavigationShortcut, () => string>
> = {
  GH: homeRouter,
  GP: () => peopleRouter({ searchText: Option.none() }),
  GF: filesIndexRouter,
  GN: nestedRouter,
}

const setRoute = (nextRoute: ApplicationRoute) =>
  makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModel = makeNoopStep()

type InformPeopleOfRouteChange =
  | typeof keepModel
  | ReturnType<typeof PeoplePageBinding.informOfRouteChange>

export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),

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
    const informPeopleOfRouteChange =
      Transition.matchOrElse<InformPeopleOfRouteChange>()(
        transition,
        'People',
        {
          Entered: peopleRoute =>
            PeoplePageBinding.informOfRouteChange({ route: peopleRoute }),
          Stayed: ({ nextRoute }) =>
            PeoplePageBinding.informOfRouteChange({ route: nextRoute }),
        },
        () => keepModel,
      )

    return Update.combineSteps(model, [
      setRoute(nextRoute),
      informPeopleOfRouteChange,
    ])
  },

  EnteredNavigationShortcut: makeCommandsStep.fromMessage(({ shortcut }) => {
    const url = navigationUrlByShortcut[shortcut]()

    return [NavigateInternal({ url })]
  }),
})
