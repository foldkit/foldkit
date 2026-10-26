import { Equal, Option } from 'effect'
import { Transition } from 'foldkit/route'

const loadPeopleStep = (route: typeof ApplicationRoute.People.Type) =>
  ApplicationDefinition.makeCommandsStep(() => [
    FetchPeople({
      searchText: Option.getOrElse(route.searchText, () => ''),
    }),
  ])

const keepModelStep = ApplicationDefinition.makeNoopStep()
type RouteStep = ReturnType<typeof loadPeopleStep> | typeof keepModelStep

const reconcilePeopleRouteStep = (
  transition: Transition.Transition<typeof ApplicationRoute.Type>,
): RouteStep =>
  Transition.matchOrElse<RouteStep>()(
    transition,
    'People',
    {
      Entered: loadPeopleStep,
      Stayed: ({ previousRoute, nextRoute }) =>
        Equal.equals(previousRoute.searchText, nextRoute.searchText)
          ? keepModelStep
          : loadPeopleStep(nextRoute),
    },
    () => keepModelStep,
  )
