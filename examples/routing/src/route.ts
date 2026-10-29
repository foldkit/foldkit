import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, rest, slash } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Nested: {},
  People: { searchText: Schema.Option(Schema.String) },
  Person: { personId: Schema.Number },
  FilesIndex: {},
  Files: { path: Schema.NonEmptyArray(Schema.String) },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type
export type PeopleRoute = typeof ApplicationRoute.People.Type

export const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

export const nestedRouter = pipe(
  literal('nested'),
  slash(literal('route')),
  slash(literal('is')),
  slash(literal('very')),
  slash(literal('nested')),
  Route.mapTo(ApplicationRoute.Nested),
)

export const peopleRouter = pipe(
  literal('people'),
  Route.query(
    Schema.Struct({
      searchText: Schema.OptionFromOptional(Schema.String),
    }),
  ),
  Route.mapTo(ApplicationRoute.People),
)

export const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(ApplicationRoute.Person),
)

export const filesIndexRouter = pipe(
  literal('files'),
  Route.mapTo(ApplicationRoute.FilesIndex),
)

export const filesRouter = pipe(
  literal('files'),
  slash(rest('path')),
  Route.mapTo(ApplicationRoute.Files),
)

const routeParser = Route.oneOf(
  personRouter,
  peopleRouter,
  filesIndexRouter,
  filesRouter,
  nestedRouter,
  homeRouter,
)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
