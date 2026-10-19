import { Effect, Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

declare const SearchRoute: unknown

// Model the missing parameter with Option; the router composes again.
export const goodSearchRouter = pipe(
  literal('search'),
  Route.query(
    Schema.Struct({
      page: Schema.OptionFromOptional(Schema.FiniteFromString),
    }),
  ),
  Route.mapTo(SearchRoute),
)

// A decoding default supplies an encoded query value before decoding.
export const defaultedSearchRouter = pipe(
  literal('defaulted-search'),
  Route.query(
    Schema.Struct({
      page: Schema.FiniteFromString.pipe(
        Schema.withDecodingDefaultKey(Effect.succeed('1')),
      ),
    }),
  ),
  Route.mapTo(SearchRoute),
)

// A constructor default outside Route.query is fine.
export const FormModel = Schema.Struct({
  name: Schema.String.pipe(
    Schema.optionalKey,
    Schema.withConstructorDefault(Effect.succeed('')),
  ),
})
