import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  About: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))
export const aboutRouter = pipe(
  literal('about'),
  Route.mapTo(ApplicationRoute.About),
)

const routeParser = Route.oneOf(aboutRouter, homeRouter)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
