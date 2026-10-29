import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  People: { searchText: Schema.Option(Schema.String) },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type
export type PeopleRoute = typeof ApplicationRoute.People.Type
const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))
const peopleRouter = pipe(
  literal('people'),
  Route.query(
    Schema.Struct({ searchText: Schema.OptionFromOptional(Schema.String) }),
  ),
  Route.mapTo(ApplicationRoute.People),
)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  Route.oneOf(peopleRouter, homeRouter),
  ApplicationRoute.NotFound,
)
