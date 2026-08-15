import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r, slash, string } from 'foldkit/route'

export const HomeRoute = r('Home')
export const RoomRoute = r('Room', { roomId: S.String })
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([HomeRoute, RoomRoute, NotFoundRoute])

export type HomeRoute = typeof HomeRoute.Type
export type RoomRoute = typeof RoomRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
export const roomRouter = pipe(
  literal('room'),
  slash(string('roomId')),
  Route.mapTo(RoomRoute),
)
const routeParser = Route.oneOf(roomRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
