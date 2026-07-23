import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

// ❌ Bad
// The default makes page optional in the constructor-input type Route.mapTo
// encodes, so the Route.query plus Route.mapTo pipe stops typechecking.
const badSearchRouter = pipe(
  literal('search'),
  Route.query(
    S.Struct({
      page: S.FiniteFromString.pipe(S.withConstructorDefault(() => 1)),
    }),
  ),
  Route.mapTo(SearchRoute),
)

// ✅ Good
// Model the missing parameter with Option and the router composes again.
const goodSearchRouter = pipe(
  literal('search'),
  Route.query(S.Struct({ page: S.OptionFromOptional(S.FiniteFromString) })),
  Route.mapTo(SearchRoute),
)
