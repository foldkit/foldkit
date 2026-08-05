import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r } from 'foldkit/route'

export const HomeRoute = r('Home')
export const AboutRoute = r('About')
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([HomeRoute, AboutRoute, NotFoundRoute])
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
export const aboutRouter = pipe(literal('about'), Route.mapTo(AboutRoute))

const routeParser = Route.oneOf(aboutRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
