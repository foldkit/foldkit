import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Gallery: {},
  Artwork: { artworkId: Schema.Number },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const galleryRouter = pipe(
  Route.root,
  Route.mapTo(ApplicationRoute.Gallery),
)

export const artworkRouter = pipe(
  literal('artwork'),
  slash(int('artworkId')),
  Route.mapTo(ApplicationRoute.Artwork),
)

const routeParser = Route.oneOf(artworkRouter, galleryRouter)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
