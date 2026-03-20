import { Effect, Match as M, Schema as S, pipe } from 'effect'
import { Command, Navigation, Route, Runtime, Url } from 'foldkit'
import { m } from 'foldkit/message'
import { int, literal, r, slash } from 'foldkit/route'
import { evo } from 'foldkit/struct'

// ROUTE

const HomeRoute = r('Home')
const PersonRoute = r('Person', { personId: S.Number })
const NotFoundRoute = r('NotFound', { path: S.String })
const AppRoute = S.Union(HomeRoute, PersonRoute, NotFoundRoute)
type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(PersonRoute),
)
const routeParser = Route.oneOf(personRouter, homeRouter)
const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({ route: AppRoute })
type Model = typeof Model.Type

// MESSAGE

// ClickedLink and ChangedUrl are required for routing
const CompletedInternalNavigation = m('CompletedInternalNavigation')
const CompletedExternalNavigation = m('CompletedExternalNavigation')
const ClickedLink = m('ClickedLink', { request: Runtime.UrlRequest })
const ChangedUrl = m('ChangedUrl', { url: Url.Url })

const Message = S.Union(
  CompletedInternalNavigation,
  CompletedExternalNavigation,
  ClickedLink,
  ChangedUrl,
)
type Message = typeof Message.Type

// UPDATE

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      CompletedInternalNavigation: () => [model, []],
      CompletedExternalNavigation: () => [model, []],

      // Handle link clicks - decide whether to navigate or do a full page load
      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            // Same-origin link - push to history
            Internal: ({
              url,
            }): [Model, ReadonlyArray<Command.Command<Message>>] => [
              model,
              [
                Navigation.pushUrl(Url.toString(url)).pipe(
                  Effect.as(CompletedInternalNavigation()),
                  Command.make('NavigateInternal'),
                ),
              ],
            ],
            // Different-origin link - full page load
            External: ({
              href,
            }): [Model, ReadonlyArray<Command.Command<Message>>] => [
              model,
              [
                Navigation.load(href).pipe(
                  Effect.as(CompletedExternalNavigation()),
                  Command.make('LoadExternal'),
                ),
              ],
            ],
          }),
        ),

      // URL changed - parse it and update the route
      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],
    }),
  )
