import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Login: {},
  Dashboard: {},
  Settings: {},
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const LoggedOutRoute = AppRoute.subset(['Home', 'Login', 'NotFound'])
export const LoggedInRoute = AppRoute.subset([
  'Dashboard',
  'Settings',
  'NotFound',
])

export type LoggedOutRoute = typeof LoggedOutRoute.Type
export type LoggedInRoute = typeof LoggedInRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
export const loginRouter = pipe(literal('login'), Route.mapTo(AppRoute.Login))
export const dashboardRouter = pipe(
  literal('dashboard'),
  Route.mapTo(AppRoute.Dashboard),
)
export const settingsRouter = pipe(
  literal('settings'),
  Route.mapTo(AppRoute.Settings),
)

const routeParser = Route.oneOf(
  loginRouter,
  dashboardRouter,
  settingsRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
