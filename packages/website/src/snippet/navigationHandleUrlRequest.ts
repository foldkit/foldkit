import { Effect, Schema, pipe } from 'effect'
import { Block, Command, Navigation, Program, Route, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

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
const urlToApplicationRoute = Route.parseUrlWithFallback(
  Route.oneOf(personRouter, homeRouter),
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

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

class Application extends Block<Application, Readonly<{ url: Url.Url }>>()(
  'Application',
  { Model, Message, Command: [NavigateInternal, LoadExternal] },
) {}

const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    return {
      model: { route: urlToApplicationRoute(url) },

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

        ClickedLink: (model, { request }) =>
          Navigation.UrlRequest.match(request, {
            Internal: ({ url: internalUrl }) => ({
              model,
              commands: [NavigateInternal({ url: Url.toString(internalUrl) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url: nextUrl }) => ({
          model: modifyFields(model, {
            route: () => urlToApplicationRoute(nextUrl),
          }),
        }),
      },

      commands: {
        NavigateInternal: ({ url: internalUrl }) =>
          Navigation.pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          Navigation.load(href).pipe(
            Effect.as(Message.CompletedLoadExternal()),
          ),
      },

      view: (model, h) => ({
        title: model.route._tag,
        body: h.main([], [model.route._tag]),
      }),
    }
  }),
)

// The Program delivers link clicks and URL changes to the root Block
const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
})
