import { Effect, Schema, pipe } from 'effect'
import { Block, Navigation, Route, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

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

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep, makeComposition, makeCommand } =
  ApplicationBlock

const ApplicationComposition = makeComposition()

const NavigateInternal = makeCommand('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  handler: function* () {
    return ({ url }) =>
      Navigation.pushUrl(url).pipe(
        Effect.as(Message.CompletedNavigateInternal()),
      )
  },
})

const LoadExternal = makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      Navigation.load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),

  ClickedLink: (model, { request }) =>
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

  ChangedUrl: makeFieldsStep.fromMessage(({ url }) => ({
    route: () => urlToApplicationRoute(url),
  })),
})
