import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

declare const SearchRoute: unknown

// Model the missing parameter with Option; the router composes again.
export const goodSearchRouter = pipe(
  literal('search'),
  Route.query(S.Struct({ page: S.OptionFromOptional(S.FiniteFromString) })),
  Route.mapTo(SearchRoute),
)

// A constructor default outside Route.query is fine.
export const FormModel = S.Struct({
  name: S.String.pipe(S.withConstructorDefault(() => '')),
})
