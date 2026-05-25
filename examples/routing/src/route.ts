import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { int, literal, r, slash } from 'foldkit/route'

export const HomeRoute = r('Home')
export const NestedRoute = r('Nested')
export const PeopleRoute = r('People', { searchText: S.Option(S.String) })
export const PersonRoute = r('Person', { personId: S.Number })
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([
  HomeRoute,
  NestedRoute,
  PeopleRoute,
  PersonRoute,
  NotFoundRoute,
])

export type HomeRoute = typeof HomeRoute.Type
export type NestedRoute = typeof NestedRoute.Type
export type PeopleRoute = typeof PeopleRoute.Type
export type PersonRoute = typeof PersonRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))

export const nestedRouter = pipe(
  literal('nested'),
  slash(literal('route')),
  slash(literal('is')),
  slash(literal('very')),
  slash(literal('nested')),
  Route.mapTo(NestedRoute),
)

export const peopleRouter = pipe(
  literal('people'),
  Route.query(
    S.Struct({
      searchText: S.OptionFromOptional(S.String),
    }),
  ),
  Route.mapTo(PeopleRoute),
)

export const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(PersonRoute),
)

const routeParser = Route.oneOf(
  personRouter,
  peopleRouter,
  nestedRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
