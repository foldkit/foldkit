import { Effect, Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

// ❌ Bad
// Constructor defaults run only during make, not Route.query decoding.
const badSearchRouter = pipe(
  literal('search'),
  Route.query(
    Schema.Struct({
      page: Schema.FiniteFromString.pipe(
        Schema.withConstructorDefault(Effect.succeed(1)),
      ),
    }),
  ),
  Route.mapTo(SearchRoute),
)

// ✅ Good
// Use a decoding default when an absent query key should produce a value.
const goodSearchRouter = pipe(
  literal('search'),
  Route.query(
    Schema.Struct({
      page: Schema.FiniteFromString.pipe(
        Schema.withDecodingDefaultKey(Effect.succeed('1')),
      ),
    }),
  ),
  Route.mapTo(SearchRoute),
)
