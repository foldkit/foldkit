import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Login: {},
  Dashboard: {},
  Settings: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const LoggedOutRoute = ApplicationRoute.subset([
  'Home',
  'Login',
  'NotFound',
])
export type LoggedOutRoute = typeof LoggedOutRoute.Type
export const LoggedInRoute = ApplicationRoute.subset([
  'Dashboard',
  'Settings',
  'NotFound',
])
export type LoggedInRoute = typeof LoggedInRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))
export const loginRouter = pipe(
  literal('login'),
  Route.mapTo(ApplicationRoute.Login),
)
export const dashboardRouter = pipe(
  literal('dashboard'),
  Route.mapTo(ApplicationRoute.Dashboard),
)
export const settingsRouter = pipe(
  literal('settings'),
  Route.mapTo(ApplicationRoute.Settings),
)

const routeParser = Route.oneOf(
  loginRouter,
  dashboardRouter,
  settingsRouter,
  homeRouter,
)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
