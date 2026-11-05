import { Equal, Option } from 'effect'
import { Transition } from 'foldkit/route'

import { makeCommandsStep, makeNoopStep } from './block'

const loadPeople = (route: PeopleRoute) =>
  makeCommandsStep(() => [
    FetchPeople({
      searchText: Option.getOrElse(route.searchText, () => ''),
    }),
  ])

const keepModel = makeNoopStep()
type RouteStep = ReturnType<typeof loadPeople> | typeof keepModel

const reconcilePeopleRoute = (
  transition: Transition.Transition<ApplicationRoute>,
): RouteStep =>
  Transition.matchOrElse<RouteStep>()(
    transition,
    'People',
    {
      Entered: loadPeople,
      Stayed: ({ previousRoute, nextRoute }) =>
        Equal.equals(previousRoute.searchText, nextRoute.searchText)
          ? keepModel
          : loadPeople(nextRoute),
    },
    () => keepModel,
  )
