import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Gallery: {},
  Painting: { paintingId: Schema.Number },
  Studio: {},
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

export const galleryRouter = pipe(
  literal('gallery'),
  Route.mapTo(AppRoute.Gallery),
)

export const paintingRouter = pipe(
  literal('gallery'),
  slash(int('paintingId')),
  Route.mapTo(AppRoute.Painting),
)

export const studioRouter = pipe(
  literal('studio'),
  Route.mapTo(AppRoute.Studio),
)

const routeParser = Route.oneOf(
  paintingRouter,
  galleryRouter,
  studioRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
