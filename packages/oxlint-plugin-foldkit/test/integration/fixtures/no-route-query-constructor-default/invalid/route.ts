import { Effect, Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, query } from 'foldkit/route'

declare const SearchRoute: unknown

// Constructor defaults run only during make, so this does not default a
// missing query parameter during Route.query decoding.
export const badSearchRouter = pipe(
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

// The named route import is the same API and the default is still inert.
export const badNamedSearchRouter = pipe(
  literal('named-search'),
  query(
    Schema.Struct({
      page: Schema.FiniteFromString.pipe(
        Schema.withConstructorDefault(Effect.succeed(1)),
      ),
    }),
  ),
  Route.mapTo(SearchRoute),
)
