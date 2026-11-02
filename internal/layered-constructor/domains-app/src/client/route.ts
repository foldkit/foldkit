import { Option, Schema, String, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'

import { SITE_ORIGIN } from './site'

export const ApplicationRoute = defineRouteUnion({
  Search: { q: Schema.Option(Schema.String) },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const searchRouter = pipe(
  Route.root,
  Route.query(Schema.Struct({ q: Schema.OptionFromOptional(Schema.String) })),
  Route.mapTo(ApplicationRoute.Search),
)

const routeParser = Route.oneOf(searchRouter)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

export const routeToQuery = ApplicationRoute.match({
  Search: ({ q }) => Option.getOrElse(q, () => ''),
  NotFound: () => '',
})

export const searchHref = (query: string): string => {
  const q = Option.liftPredicate(query, String.isNonEmpty)
  return searchRouter({ q })
}

export const routeToCanonicalUrl = ApplicationRoute.match({
  Search: () => `${SITE_ORIGIN}/`,
  NotFound: ({ path }) => `${SITE_ORIGIN}${path}`,
})
