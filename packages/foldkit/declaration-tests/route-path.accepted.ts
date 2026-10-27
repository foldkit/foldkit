import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import {
  defineRouteUnion,
  literal,
  mapTo,
  oneOf,
  parsePathWithFallback,
  root,
  slash,
  string,
} from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Person: { personId: Schema.String },
  NotFound: { path: Schema.String },
})

export const homeRouter = pipe(root, mapTo(ApplicationRoute.Home))
export const personRouter = pipe(
  literal('people'),
  slash(string('personId')),
  mapTo(ApplicationRoute.Person),
)
export const parsePath = parsePathWithFallback(
  oneOf(homeRouter, personRouter),
  ApplicationRoute.NotFound,
)
export const parsed = parsePath('/people/ada')
export const parsePersonPath = Route.parsePathWithFallback(
  personRouter,
  ApplicationRoute.NotFound,
)
export const parsedPerson = parsePersonPath('/people/ada')

export const PathFailure = Schema.Struct({ path: Schema.String })
export const parsePersonOrFailure = parsePathWithFallback(
  personRouter,
  PathFailure,
)
