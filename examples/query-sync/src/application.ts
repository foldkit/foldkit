import { Effect, Match, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { type Document, Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Browse } from './browse'
import {
  ApplicationRoute,
  browseRouter,
  emptyBrowseFields,
  routeToBrowseFields,
  urlToApplicationRoute,
} from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  browse: Browse,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
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

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 — Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [
          h.Href(browseRouter(emptyBrowseFields)),
          h.Class('text-emerald-600 hover:underline'),
        ],
        ['← Back to Dinosaur Explorer'],
      ),
    ],
  )

const routeTitle = (route: ApplicationRoute): string =>
  Match.value(route).pipe(
    Match.tag('Browse', () => 'Dinosaur Explorer'),
    Match.orElse(() => 'Not Found | Dinosaur Explorer'),
  )

const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const routeContent = ApplicationRoute.match(model.route, {
    Browse: () => model.browse.view(),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  const body = h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      h.header(
        [h.Class('bg-emerald-600 text-white px-6 py-4 mb-8 shadow-sm')],
        [
          h.div(
            [h.Class('max-w-6xl mx-auto flex items-center gap-3')],
            [
              h.span([h.Class('text-lg font-semibold')], ['foldkit']),
              h.span(
                [h.Class('text-emerald-200 text-sm')],
                ['query-sync example'],
              ),
            ],
          ),
        ],
      ),
      h.main([h.Class('pb-12')], [routeContent]),
    ],
  )

  return { title: routeTitle(model.route), body }
}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const route = urlToApplicationRoute(url)
    const browse = yield* new Browse('browse', {
      fields: routeToBrowseFields(route),
    })

    return {
      model: { route, browse },

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(url) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url }) => {
          const nextRoute = urlToApplicationRoute(url)

          return {
            model: modifyFields(model, { route: () => nextRoute }),
            messages: [
              model.browse.send(
                Browse.Message.InformedOfRouteChange({
                  fields: routeToBrowseFields(nextRoute),
                }),
              ),
            ],
          }
        },
      },

      commands: {
        NavigateInternal: ({ url }) =>
          pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view,
    }
  }),
)
