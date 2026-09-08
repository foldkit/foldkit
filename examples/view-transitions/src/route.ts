import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Gallery: {},
  Artwork: { artworkId: Schema.Number },
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const galleryRouter = pipe(Route.root, Route.mapTo(AppRoute.Gallery))

export const artworkRouter = pipe(
  literal('artwork'),
  slash(int('artworkId')),
  Route.mapTo(AppRoute.Artwork),
)

const routeParser = Route.oneOf(artworkRouter, galleryRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
