import { Effect, Schema, pipe } from 'effect'
import { Block, Command, Route } from 'foldkit'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { defineRouteUnion, literal } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  About: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))
const aboutRouter = pipe(literal('about'), Route.mapTo(ApplicationRoute.About))

const routeParser = Route.oneOf(aboutRouter, homeRouter)

const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

export const Model = Schema.Struct({
  route: ApplicationRoute,
  count: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
})
export type Message = typeof Message.Type

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model,
    Message,
    Command: [NavigateInternal, LoadExternal],
  },
) {}

type ApplicationViewBuilder = HtmlBuilder<Message>

const APP_NAME = 'Foldkit App'

const appendAppName = (page: string): string => `${page} | ${APP_NAME}`

const routeTitle = (route: ApplicationRoute): string =>
  pipe(
    ApplicationRoute.match(route, {
      Home: () => 'Home',
      About: () => 'About',
      NotFound: () => 'Not Found',
    }),
    appendAppName,
  )

const navigationView = (h: ApplicationViewBuilder): Html =>
  h.nav(
    [h.Class('flex gap-4')],
    [
      h.a([h.Href(homeRouter()), h.Class('underline')], ['Home']),
      h.a([h.Href(aboutRouter()), h.Class('underline')], ['About']),
    ],
  )

const pageView = (model: Model, h: ApplicationViewBuilder): Html =>
  ApplicationRoute.match(model.route, {
    Home: () =>
      h.section(
        [h.Class('grid gap-4')],
        [
          h.h1(
            [h.Id('page-title'), h.Class('text-4xl font-bold')],
            ['Statically generated home'],
          ),
          h.p(
            [],
            ['This route was rendered during the build and hydrated in place.'],
          ),
          h.button(
            [
              h.OnClick(Message.ClickedIncrement()),
              h.Class('w-fit bg-black px-4 py-2 text-white'),
            ],
            [`Count: ${model.count}`],
          ),
        ],
      ),
    About: () =>
      h.section(
        [h.Class('grid gap-4')],
        [
          h.h1(
            [h.Id('page-title'), h.Class('text-4xl font-bold')],
            ['Statically generated about page'],
          ),
          h.p(
            [],
            [
              'The same renderPage function produced this route in the same build.',
            ],
          ),
        ],
      ),
    NotFound: ({ path }) =>
      h.section(
        [h.Class('grid gap-4')],
        [
          h.h1(
            [h.Id('page-title'), h.Class('text-4xl font-bold')],
            ['Not found'],
          ),
          h.p([], [`No statically generated page exists for ${path}.`]),
        ],
      ),
  })

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    return {
      model: { route: urlToApplicationRoute(url), count: 0 },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: count => count + 1 }),
        }),
        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url: internalUrl }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(internalUrl) })],
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
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
      },

      commands: {
        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view: (model, h) => ({
        title: routeTitle(model.route),
        body: h.main(
          [
            h.Class(
              'mx-auto grid min-h-screen max-w-3xl content-center gap-10 p-8',
            ),
          ],
          [navigationView(h), pageView(model, h)],
        ),
      }),
    }
  }),
)
