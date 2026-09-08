import { Command, Runtime } from 'foldkit'
import { Transition } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// Entry-only Commands ask about the transition, not the route alone...
const commandsForTransition = (
  transition: Transition.Transition<AppRoute>,
): ReadonlyArray<Command.Command<Message>> =>
  Transition.isEntering(transition, 'People') ? [FetchPeopleFilters()] : []

// ...init builds the cold load transition, which counts as an entry...
const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)
  return {
    model: { route },
    commands: commandsForTransition(Transition.coldLoad(route)),
  }
}

// ...and the ChangedUrl handler transitions from the route the Model holds:
ChangedUrl: ({ url }) => {
  const nextRoute = urlToAppRoute(url)
  return {
    model: evo(model, { route: () => nextRoute }),
    commands: commandsForTransition(Transition.make(model.route, nextRoute)),
  }
}
