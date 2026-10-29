import { Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, PeoplePageBinding } from './composition'
import { makeCommandsStep, makeFieldsStep, makeNoopStep } from './definition'
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

const setRouteStep = (nextRoute: ApplicationRoute) =>
  makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModelStep = makeNoopStep()

type InformPeopleRouteStep =
  | typeof keepModelStep
  | ReturnType<typeof PeoplePageBinding.informRouteChanged>

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
    const informPeopleRouteStep =
      Transition.matchOrElse<InformPeopleRouteStep>()(
        transition,
        'People',
        {
          Entered: peopleRoute =>
            PeoplePageBinding.informRouteChanged({ route: peopleRoute }),
          Stayed: ({ nextRoute }) =>
            PeoplePageBinding.informRouteChanged({ route: nextRoute }),
        },
        () => keepModelStep,
      )

    return Update.combineSteps(model, [
      setRouteStep(nextRoute),
      informPeopleRouteStep,
    ])
  },

  EnteredNavigationShortcut: makeCommandsStep.fromMessage(({ shortcut }) => {
    const url = navigationUrlByShortcut[shortcut]()

    return [NavigateInternal({ url })]
  }),
})
