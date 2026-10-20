import { Equal, Option } from 'effect'
import { Update } from 'foldkit'
import { Transition } from 'foldkit/route'

type RouteStep = Update.Step<Model, Message>
type PeopleRoute = typeof AppRoute.People.Type

const loadPeople =
  (route: PeopleRoute): RouteStep =>
  model => ({
    model,
    commands: [
      FetchPeople({
        searchText: Option.getOrElse(route.searchText, () => ''),
      }),
    ],
  })

const keepModel: RouteStep = model => ({ model })

const reconcilePeopleRoute = (
  transition: Transition.Transition<AppRoute>,
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
