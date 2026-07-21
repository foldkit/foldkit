import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { int, literal, r, slash } from 'foldkit/route'

export const GalleryRoute = r('Gallery')
export const ArtworkRoute = r('Artwork', { artworkId: S.Number })
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([GalleryRoute, ArtworkRoute, NotFoundRoute])

export type GalleryRoute = typeof GalleryRoute.Type
export type ArtworkRoute = typeof ArtworkRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

export const galleryRouter = pipe(Route.root, Route.mapTo(GalleryRoute))

export const artworkRouter = pipe(
  literal('artwork'),
  slash(int('artworkId')),
  Route.mapTo(ArtworkRoute),
)

const routeParser = Route.oneOf(artworkRouter, galleryRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
