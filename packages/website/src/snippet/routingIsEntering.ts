import { Command } from 'foldkit'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'

// Entry-only Commands ask about the transition, not the route alone...
const commandsForTransition = (
  transition: Transition.Transition<ApplicationRoute>,
): ReadonlyArray<Command.Command<Message>> =>
  Transition.isEntering(transition, 'People') ? [FetchPeopleFilters()] : []

// ...init builds the cold load transition, which counts as an entry...
const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)
  return {
    model: { route },
    commands: commandsForTransition(Transition.coldLoad(route)),
  }
})

// ...and the ChangedUrl handler transitions from the route the Model holds:
ChangedUrl: ({ url }) => {
  const nextRoute = urlToApplicationRoute(url)
  return {
    model: modifyFields(model, { route: () => nextRoute }),
    commands: commandsForTransition(Transition.make(model.route, nextRoute)),
  }
}
