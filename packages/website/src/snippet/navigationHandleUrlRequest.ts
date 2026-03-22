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

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedLoadExternal = m('CompletedLoadExternal')
const ClickedLink = m('ClickedLink', { request: Runtime.UrlRequest })
const ChangedUrl = m('ChangedUrl', { url: Url.Url })

const Message = S.Union(
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
)
type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define(
  'NavigateInternal',
  CompletedNavigateInternal,
)
const LoadExternal = Command.define('LoadExternal', CompletedLoadExternal)

// UPDATE

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): readonly [Model, ReadonlyArray<Command.Command<Message>>] => [
              model,
              [
                NavigateInternal(
                  Navigation.pushUrl(Url.toString(url)).pipe(
                    Effect.as(CompletedNavigateInternal()),
                  ),
                ),
              ],
            ],
            External: ({
              href,
            }): readonly [Model, ReadonlyArray<Command.Command<Message>>] => [
              model,
              [
                LoadExternal(
                  Navigation.load(href).pipe(
                    Effect.as(CompletedLoadExternal()),
                  ),
                ),
              ],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],
    }),
  )
