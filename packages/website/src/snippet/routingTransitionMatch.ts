import { Equal, Option } from 'effect'
import { Transition } from 'foldkit/route'

const loadPeople = (route: typeof ApplicationRoute.People.Type) =>
  ApplicationDefinition.makeCommandsStep(() => [
    FetchPeople({
      searchText: Option.getOrElse(route.searchText, () => ''),
    }),
  ])

const keepModel = ApplicationDefinition.makeNoopStep()
type RouteStep = ReturnType<typeof loadPeople> | typeof keepModel

const reconcilePeopleRoute = (
  transition: Transition.Transition<typeof ApplicationRoute.Type>,
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
