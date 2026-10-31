import { Effect, Schema, pipe } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { Block, Command, Route, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Transition, defineRouteUnion, literal } from 'foldkit/route'
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

const Model = Schema.Struct({
  route: ApplicationRoute,
  filters: Schema.Array(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedUrl: { url: Url.Url },
  SucceededFetchPeopleFilters: { filters: Schema.Array(Schema.String) },
  FailedFetchPeopleFilters: {},
})
type Message = typeof Message.Type

const FetchPeopleFilters = Command.define('FetchPeopleFilters', {
  messages: [
    Message.SucceededFetchPeopleFilters,
    Message.FailedFetchPeopleFilters,
  ],
})

type TransitionCommands = ReadonlyArray<ReturnType<typeof FetchPeopleFilters>>

// Entry-only Commands ask about the transition, not the route alone...
const commandsForTransition = (
  transition: Transition.Transition<ApplicationRoute>,
): TransitionCommands =>
  Transition.isEntering(transition, 'People') ? [FetchPeopleFilters()] : []

class Application extends Block<Application, Readonly<{ url: Url.Url }>>()(
  'Application',
  { Model, Message, Command: [FetchPeopleFilters] },
) {}

const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const client = yield* HttpClient.HttpClient
    const route = urlToApplicationRoute(url)

    return {
      model: { route, filters: [] },

      // ...the constructor builds the cold load transition, which counts as an entry...
      start: commandsForTransition(Transition.coldLoad(route)),

      update: {
        // ...and the ChangedUrl handler transitions from the route the Model holds
        ChangedUrl: (model, { url: nextUrl }) => {
          const nextRoute = urlToApplicationRoute(nextUrl)

          return {
            model: modifyFields(model, { route: () => nextRoute }),
            commands: commandsForTransition(
              Transition.make(model.route, nextRoute),
            ),
          }
        },
        SucceededFetchPeopleFilters: (model, { filters }) => ({
          model: modifyFields(model, { filters: () => filters }),
        }),
        FailedFetchPeopleFilters: model => ({ model }),
      },

      commands: {
        FetchPeopleFilters: () =>
          client.get('/api/people/filters').pipe(
            Effect.flatMap(
              HttpClientResponse.schemaBodyJson(Schema.Array(Schema.String)),
            ),
            Effect.map(filters =>
              Message.SucceededFetchPeopleFilters({ filters }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.FailedFetchPeopleFilters()),
            ),
          ),
      },

      view: (model, h) => ({
        title: model.route._tag,
        body: h.main([], [model.route._tag]),
      }),
    }
  }),
)
