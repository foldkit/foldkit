import { Effect, Schema, pipe } from 'effect'
import { Navigation, Route, Url, defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

// ROUTE

const ApplicationRoute = defineRouteUnion({
  Home: {},
  Person: { personId: Schema.Number },
  NotFound: { path: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(ApplicationRoute.Person),
)
const routeParser = Route.oneOf(personRouter, homeRouter)
const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

const Model = Schema.Struct({ route: ApplicationRoute })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: Navigation.UrlRequest },
  ChangedUrl: { url: Url.Url },
})
type Message = typeof Message.Type

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition()

const NavigateInternal = Application.command('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  handler: function* () {
    return ({ url }) =>
      Navigation.pushUrl(url).pipe(
        Effect.as(Message.CompletedNavigateInternal()),
      )
  },
})

const LoadExternal = Application.command('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      Navigation.load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      Navigation.UrlRequest.match(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: Url.toString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, {
        route: () => urlToApplicationRoute(url),
      }),
    }),
  }),
)
