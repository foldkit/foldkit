import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, rest, slash } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Nested: {},
  People: { searchText: Schema.Option(Schema.String) },
  Person: { personId: Schema.Number },
  FilesIndex: {},
  Files: { path: Schema.NonEmptyArray(Schema.String) },
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type
export type PeopleRoute = typeof AppRoute.People.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

export const nestedRouter = pipe(
  literal('nested'),
  slash(literal('route')),
  slash(literal('is')),
  slash(literal('very')),
  slash(literal('nested')),
  Route.mapTo(AppRoute.Nested),
)

export const peopleRouter = pipe(
  literal('people'),
  Route.query(
    Schema.Struct({
      searchText: Schema.OptionFromOptional(Schema.String),
    }),
  ),
  Route.mapTo(AppRoute.People),
)

export const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(AppRoute.Person),
)

export const filesIndexRouter = pipe(
  literal('files'),
  Route.mapTo(AppRoute.FilesIndex),
)

export const filesRouter = pipe(
  literal('files'),
  slash(rest('path')),
  Route.mapTo(AppRoute.Files),
)

const routeParser = Route.oneOf(
  personRouter,
  peopleRouter,
  filesIndexRouter,
  filesRouter,
  nestedRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
