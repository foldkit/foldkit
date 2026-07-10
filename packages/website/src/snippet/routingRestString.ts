import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r, restString, slash } from 'foldkit/route'

const VaultIndexRoute = r('VaultIndex')
const VaultNoteRoute = r('VaultNote', { path: S.String })

// Matches: /vault
const vaultIndexRouter = pipe(literal('vault'), Route.mapTo(VaultIndexRoute))

// Matches: /vault/20-upgrade/teach/the-elm-architecture.md
// path: '20-upgrade/teach/the-elm-architecture.md'
const vaultNoteRouter = pipe(
  literal('vault'),
  slash(restString('path')),
  Route.mapTo(VaultNoteRoute),
)

// Builds: /vault/20-upgrade/teach/the-elm-architecture.md
const noteUrl = vaultNoteRouter({
  path: '20-upgrade/teach/the-elm-architecture.md',
})
