import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Gallery: {},
  Painting: { paintingId: Schema.Number },
  Studio: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

export const galleryRouter = pipe(
  literal('gallery'),
  Route.mapTo(ApplicationRoute.Gallery),
)

export const paintingRouter = pipe(
  literal('gallery'),
  slash(int('paintingId')),
  Route.mapTo(ApplicationRoute.Painting),
)

export const studioRouter = pipe(
  literal('studio'),
  Route.mapTo(ApplicationRoute.Studio),
)

const routeParser = Route.oneOf(
  paintingRouter,
  galleryRouter,
  studioRouter,
  homeRouter,
)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
