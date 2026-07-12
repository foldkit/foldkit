import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { int, literal, r, slash } from 'foldkit/route'

export const HomeRoute = r('Home')
export const GalleryRoute = r('Gallery')
export const PaintingRoute = r('Painting', { paintingId: S.Number })
export const StudioRoute = r('Studio')
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([
  HomeRoute,
  GalleryRoute,
  PaintingRoute,
  StudioRoute,
  NotFoundRoute,
])

export type HomeRoute = typeof HomeRoute.Type
export type GalleryRoute = typeof GalleryRoute.Type
export type PaintingRoute = typeof PaintingRoute.Type
export type StudioRoute = typeof StudioRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))

export const galleryRouter = pipe(literal('gallery'), Route.mapTo(GalleryRoute))

export const paintingRouter = pipe(
  literal('gallery'),
  slash(int('paintingId')),
  Route.mapTo(PaintingRoute),
)

export const studioRouter = pipe(literal('studio'), Route.mapTo(StudioRoute))

const routeParser = Route.oneOf(
  paintingRouter,
  galleryRouter,
  studioRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
