import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, rest, slash } from 'foldkit/route'

const ApplicationRoute = defineRouteUnion({
  FilesIndex: {},
  Files: { path: Schema.NonEmptyArray(Schema.String) },
})
type ApplicationRoute = typeof ApplicationRoute.Type
// Matches: /files
const filesIndexRouter = pipe(
  literal('files'),
  Route.mapTo(ApplicationRoute.FilesIndex),
)

// Matches: /files/documents/taxes/2024.pdf
// path: ['documents', 'taxes', '2024.pdf']
const filesRouter = pipe(
  literal('files'),
  slash(rest('path')),
  Route.mapTo(ApplicationRoute.Files),
)

// Builds: /files/documents/taxes
const taxesUrl = filesRouter({ path: ['documents', 'taxes'] })
