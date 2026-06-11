import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r, rest, slash } from 'foldkit/route'

const FilesIndexRoute = r('FilesIndex')
const FilesRoute = r('Files', { path: S.NonEmptyArray(S.String) })

// Matches: /files
const filesIndexRouter = pipe(literal('files'), Route.mapTo(FilesIndexRoute))

// Matches: /files/documents/taxes/2024.pdf
// path: ['documents', 'taxes', '2024.pdf']
const filesRouter = pipe(
  literal('files'),
  slash(rest('path')),
  Route.mapTo(FilesRoute),
)

// Builds: /files/documents/taxes
const taxesUrl = filesRouter({ path: ['documents', 'taxes'] })
