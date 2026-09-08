import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, rest, slash } from 'foldkit/route'

const AppRoute = defineRouteUnion({
  FilesIndex: {},
  Files: { path: Schema.NonEmptyArray(Schema.String) },
})

// Matches: /files
const filesIndexRouter = pipe(
  literal('files'),
  Route.mapTo(AppRoute.FilesIndex),
)

// Matches: /files/documents/taxes/2024.pdf
// path: ['documents', 'taxes', '2024.pdf']
const filesRouter = pipe(
  literal('files'),
  slash(rest('path')),
  Route.mapTo(AppRoute.Files),
)

// Builds: /files/documents/taxes
const taxesUrl = filesRouter({ path: ['documents', 'taxes'] })
