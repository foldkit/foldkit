import { Effect, Schema, pipe } from 'effect'
import { Command, Navigation, Route, type Update, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'
import { evo } from 'foldkit/struct'

// ROUTE

const AppRoute = defineRouteUnion({
  Home: {},
  Person: { personId: Schema.Number },
  NotFound: { path: Schema.String },
})
type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(AppRoute.Person),
)
const routeParser = Route.oneOf(personRouter, homeRouter)
const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// MODEL

const Model = Schema.Struct({ route: AppRoute })
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: Navigation.UrlRequest },
  ChangedUrl: { url: Url.Url },
})
type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    Navigation.pushUrl(url).pipe(
      Effect.as(Message.CompletedNavigateInternal()),
    ),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    Navigation.load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      Navigation.UrlRequest.match<UpdateReturn>(request, {
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
      model: evo(model, {
        route: () => urlToAppRoute(url),
      }),
    }),
  })
