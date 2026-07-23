import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

declare const SearchRoute: unknown

// The default makes `page` optional in the constructor-input type that
// Route.mapTo encodes, so the Route.query plus Route.mapTo pipe stops
// typechecking.
export const badSearchRouter = pipe(
  literal('search'),
  Route.query(
    S.Struct({
      page: S.FiniteFromString.pipe(S.withConstructorDefault(() => 1)),
    }),
  ),
  Route.mapTo(SearchRoute),
)
