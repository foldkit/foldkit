import { Match, Option } from 'effect'
import { Command, Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// Route-driven Commands live in one helper...
const commandsForRoute = (
  route: AppRoute,
): ReadonlyArray<Command.Command<Message>> =>
  Match.value(route).pipe(
    Match.withReturnType<ReadonlyArray<Command.Command<Message>>>(),
    Match.tag('People', ({ searchText }) => [
      FetchPeople({ searchText: Option.getOrElse(searchText, () => '') }),
    ]),
    Match.orElse(() => []),
  )

// ...which init calls for the cold load...
const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)
  return { model: { route }, commands: commandsForRoute(route) }
}

// ...and the ChangedUrl handler calls for in-app navigation:
ChangedUrl: ({ url }) => {
  const route = urlToAppRoute(url)
  return {
    model: evo(model, { route: () => route }),
    commands: commandsForRoute(route),
  }
}
