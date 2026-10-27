import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

const ApplicationRoute = defineRouteUnion({
  Project: {
    projectId: Schema.String,
    search: Schema.Option(Schema.String),
  },
  NotFound: { path: Schema.String },
})

const projectRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  Route.query(
    Schema.Struct({ search: Schema.OptionFromOptional(Schema.String) }),
  ),
  Route.mapTo(ApplicationRoute.Project),
)

const pathToApplicationRoute = Route.parsePathWithFallback(
  projectRouter,
  ApplicationRoute.NotFound,
)

const route = pathToApplicationRoute(
  '/projects/platform?search=keyboard#issues',
)
