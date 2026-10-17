import { Match, Option } from 'effect'
import { Command } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'

// Route-driven Commands live in one helper...
const commandsForRoute = (
  route: ApplicationRoute,
): ReadonlyArray<Command.Command<Message>> =>
  Match.value(route).pipe(
    Match.withReturnType<ReadonlyArray<Command.Command<Message>>>(),
    Match.tag('People', ({ searchText }) => [
      FetchPeople({ searchText: Option.getOrElse(searchText, () => '') }),
    ]),
    Match.orElse(() => []),
  )

// ...which init calls for the cold load...
const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)
  return { model: { route }, commands: commandsForRoute(route) }
})

// ...and the ChangedUrl handler calls for in-app navigation:
ChangedUrl: ({ url }) => {
  const route = urlToApplicationRoute(url)
  return {
    model: modifyFields(model, { route: () => route }),
    commands: commandsForRoute(route),
  }
}
