import { Schema } from 'effect'
import { defineRouteUnion } from 'foldkit/route'

const ApplicationRoute = defineRouteUnion({
  Home: {},
  People: { searchText: Schema.Option(Schema.String) },
  Person: { personId: Schema.Number },
  NotFound: { path: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type
