import { Command, Runtime } from 'foldkit'
import { Transition } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// Pin the application's route union once and alias the predicate
const isEntering = Transition.isEntering<AppRoute>
const isEnteringPeople = isEntering('People')

// Entry-only Commands ask about the transition, not the route alone...
const commandsForTransition = (
  transition: Transition.Transition<AppRoute>,
): ReadonlyArray<Command.Command<Message>> =>
  isEnteringPeople(transition) ? [FetchPeopleFilters()] : []

// ...init builds the cold load transition, which counts as an entry...
const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)
  return [{ route }, commandsForTransition(Transition.coldLoad(route))]
}

// ...and the ChangedUrl handler transitions from the route the Model holds:
ChangedUrl: ({ url }) => {
  const nextRoute = urlToAppRoute(url)
  return [
    evo(model, { route: () => nextRoute }),
    commandsForTransition(Transition.make(model.route, nextRoute)),
  ]
}
