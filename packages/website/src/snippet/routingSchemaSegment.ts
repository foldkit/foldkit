import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, schemaSegment, slash } from 'foldkit/route'

// A branded id: structurally a number, but its own type. The brand stops it
// from being mixed up with another number, like an OrderId or a count.
const PersonId = Schema.FiniteFromString.pipe(Schema.brand('PersonId'))
type PersonId = typeof PersonId.Type

const ApplicationRoute = defineRouteUnion({
  Person: { personId: PersonId },
})
type ApplicationRoute = typeof ApplicationRoute.Type
// int('personId') captures a bare number. schemaSegment decodes the segment
// through the schema, so the route carries a PersonId instead.
//
// Parses: /people/42  →  ApplicationRoute.Person { personId: PersonId(42) }
const personRouter = pipe(
  literal('people'),
  slash(schemaSegment('personId', PersonId)),
  Route.mapTo(ApplicationRoute.Person),
)

// Builds: /people/42. The brand is required, so a bare number or a different
// id type is a compile error.
const personUrl = personRouter({ personId: PersonId.make(42) })
