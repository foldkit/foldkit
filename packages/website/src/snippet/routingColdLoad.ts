import { Match as M, Option } from 'effect'
import { Command, Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// Route-driven Commands live in one helper...
const commandsForRoute = (
  route: AppRoute,
): ReadonlyArray<Command.Command<Message>> =>
  M.value(route).pipe(
    M.withReturnType<ReadonlyArray<Command.Command<Message>>>(),
    M.tag('People', ({ searchText }) => [
      FetchPeople({ searchText: Option.getOrElse(searchText, () => '') }),
    ]),
    M.orElse(() => []),
  )

// ...which init calls for the cold load...
const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)
  return [{ route }, commandsForRoute(route)]
}

// ...and the ChangedUrl handler calls for in-app navigation:
ChangedUrl: ({ url }) => {
  const route = urlToAppRoute(url)
  return [evo(model, { route: () => route }), commandsForRoute(route)]
}
