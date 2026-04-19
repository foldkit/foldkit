import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r } from 'foldkit/route'

export const HomeRoute = r('Home')
export const LoginRoute = r('Login')
export const DashboardRoute = r('Dashboard')
export const SettingsRoute = r('Settings')
export const NotFoundRoute = r('NotFound', { path: S.String })

export type HomeRoute = typeof HomeRoute.Type
export type LoginRoute = typeof LoginRoute.Type
export type DashboardRoute = typeof DashboardRoute.Type
export type SettingsRoute = typeof SettingsRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type

export const LoggedOutRoute = S.Union(HomeRoute, LoginRoute, NotFoundRoute)
export const LoggedInRoute = S.Union(
  DashboardRoute,
  SettingsRoute,
  NotFoundRoute,
)
export const AppRoute = S.Union(
  HomeRoute,
  LoginRoute,
  DashboardRoute,
  SettingsRoute,
  NotFoundRoute,
)

export type LoggedOutRoute = typeof LoggedOutRoute.Type
export type LoggedInRoute = typeof LoggedInRoute.Type
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
export const loginRouter = pipe(literal('login'), Route.mapTo(LoginRoute))
export const dashboardRouter = pipe(
  literal('dashboard'),
  Route.mapTo(DashboardRoute),
)
export const settingsRouter = pipe(
  literal('settings'),
  Route.mapTo(SettingsRoute),
)

const routeParser = Route.oneOf(
  loginRouter,
  dashboardRouter,
  settingsRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
