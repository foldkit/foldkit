import { Schema, String, pipe } from 'effect'
import { Route } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

// ROUTE

const AppRoute = defineRouteUnion({
  Home: {},
  Person: { personId: Schema.Number },
})
type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(AppRoute.Person),
)

// CANONICAL

const SITE_URL = 'https://app.example'

const routeToCanonicalUrl = (route: AppRoute): string =>
  String.concat(
    SITE_URL,
    AppRoute.match(route, {
      Home: () => homeRouter(),
      Person: ({ personId }) => personRouter({ personId }),
    }),
  )

// VIEW

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: pageTitle(model.route),
  canonical: routeToCanonicalUrl(model.route),
  body: h.div([h.Class('mx-auto max-w-prose p-6')], [pageContent(model, h)]),
})
