import { Effect, Match, Option, Schema, pipe } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { Block, Command, Route, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, literal } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

const ApplicationRoute = defineRouteUnion({
  Home: {},
  People: { searchText: Schema.Option(Schema.String) },
  NotFound: { path: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type

const urlToApplicationRoute = Route.parseUrlWithFallback(
  Route.oneOf(
    pipe(
      literal('people'),
      Route.query(
        Schema.Struct({ searchText: Schema.OptionFromOptional(Schema.String) }),
      ),
      Route.mapTo(ApplicationRoute.People),
    ),
    pipe(Route.root, Route.mapTo(ApplicationRoute.Home)),
  ),
  ApplicationRoute.NotFound,
)

const Person = Schema.Struct({ id: Schema.Number, name: Schema.String })

const Model = Schema.Struct({
  route: ApplicationRoute,
  people: Schema.Array(Person),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedUrl: { url: Url.Url },
  SucceededFetchPeople: { people: Schema.Array(Person) },
  FailedFetchPeople: {},
})
type Message = typeof Message.Type

const FetchPeople = Command.define('FetchPeople', {
  args: { searchText: Schema.String },
  messages: [Message.SucceededFetchPeople, Message.FailedFetchPeople],
})

type RouteCommands = ReadonlyArray<ReturnType<typeof FetchPeople>>

// Route-driven Commands live in one helper...
const commandsForRoute = (route: ApplicationRoute): RouteCommands =>
  Match.value(route).pipe(
    Match.withReturnType<RouteCommands>(),
    Match.tag('People', ({ searchText }) => [
      FetchPeople({ searchText: Option.getOrElse(searchText, () => '') }),
    ]),
    Match.orElse(() => []),
  )

class Application extends Block<Application, Readonly<{ url: Url.Url }>>()(
  'Application',
  { Model, Message, Command: [FetchPeople] },
) {}

const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const client = yield* HttpClient.HttpClient
    const route = urlToApplicationRoute(url)

    return {
      model: { route, people: [] },

      // ...which the constructor runs for the cold load...
      start: commandsForRoute(route),

      update: {
        // ...and the ChangedUrl handler runs for in-app navigation
        ChangedUrl: (model, { url: nextUrl }) => {
          const nextRoute = urlToApplicationRoute(nextUrl)

          return {
            model: modifyFields(model, { route: () => nextRoute }),
            commands: commandsForRoute(nextRoute),
          }
        },
        SucceededFetchPeople: (model, { people }) => ({
          model: modifyFields(model, { people: () => people }),
        }),
        FailedFetchPeople: model => ({ model }),
      },

      commands: {
        FetchPeople: ({ searchText }) =>
          client.get('/api/people', { urlParams: { search: searchText } }).pipe(
            Effect.flatMap(
              HttpClientResponse.schemaBodyJson(Schema.Array(Person)),
            ),
            Effect.map(people => Message.SucceededFetchPeople({ people })),
            Effect.catch(() => Effect.succeed(Message.FailedFetchPeople())),
          ),
      },

      view: (model, h) => ({
        title: 'People',
        body: h.ul(
          [],
          model.people.map(person =>
            h.keyed('li')(`${person.id}`, [], [person.name]),
          ),
        ),
      }),
    }
  }),
)
