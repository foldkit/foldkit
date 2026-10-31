import { Effect, Schema, pipe } from 'effect'
import { Block, Route, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

const ApplicationRoute = defineRouteUnion({
  Home: {},
  People: { searchText: Schema.Option(Schema.String) },
  Person: { personId: Schema.Number },
  NotFound: { path: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))
const peopleRouter = pipe(
  literal('people'),
  Route.query(
    Schema.Struct({ searchText: Schema.OptionFromOptional(Schema.String) }),
  ),
  Route.mapTo(ApplicationRoute.People),
)
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(ApplicationRoute.Person),
)

// Combine routers. A route matches only when it consumes the whole URL.
const routeParser = Route.oneOf(
  personRouter, // /people/:id
  peopleRouter, // /people?searchText=...
  homeRouter, // /
)

// Create a parser with a fallback for unmatched URLs
const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

const Model = Schema.Struct({ route: ApplicationRoute })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedUrl: { url: Url.Url },
})
type Message = typeof Message.Type

class Application extends Block<Application, Readonly<{ url: Url.Url }>>()(
  'Application',
  { Model, Message },
) {}

const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    return {
      // The constructor parses the starting URL...
      model: { route: urlToApplicationRoute(url) },

      update: {
        // ...and the ChangedUrl handler parses every later URL
        ChangedUrl: (model, { url: nextUrl }) => ({
          model: modifyFields(model, {
            route: () => urlToApplicationRoute(nextUrl),
          }),
        }),
      },

      view: (model, h) => ({
        title: model.route._tag,
        body: h.main([], [model.route._tag]),
      }),
    }
  }),
)
