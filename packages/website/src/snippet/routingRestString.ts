import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, restString, slash } from 'foldkit/route'

const AppRoute = defineRouteUnion({
  VaultIndex: {},
  VaultNote: { path: Schema.String },
})

// Matches: /vault
const vaultIndexRouter = pipe(
  literal('vault'),
  Route.mapTo(AppRoute.VaultIndex),
)

// Matches: /vault/20-upgrade/teach/the-elm-architecture.md
// path: '20-upgrade/teach/the-elm-architecture.md'
const vaultNoteRouter = pipe(
  literal('vault'),
  slash(restString('path')),
  Route.mapTo(AppRoute.VaultNote),
)

// Builds: /vault/20-upgrade/teach/the-elm-architecture.md
const noteUrl = vaultNoteRouter({
  path: '20-upgrade/teach/the-elm-architecture.md',
})
