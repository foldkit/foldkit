import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

// ❌ Bad: the default makes page optional in the constructor-input type that
// Route.mapTo encodes, so the Route.query plus Route.mapTo pipe stops
// typechecking.
const badSearchRouter = pipe(
  literal('search'),
  Route.query(
    S.Struct({
      page: S.FiniteFromString.pipe(S.withConstructorDefault(() => 1)),
    }),
  ),
  Route.mapTo(SearchRoute),
)

// ✅ Good: model the missing parameter with Option and supply the default where
// the value is read.
const goodSearchRouter = pipe(
  literal('search'),
  Route.query(
    S.Struct({
      page: S.OptionFromOptional(S.FiniteFromString),
    }),
  ),
  Route.mapTo(SearchRoute),
)
