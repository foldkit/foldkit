import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { int, literal, slash } from 'foldkit/route'

// Matches: /
const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

// Matches: /people or /people?searchText=alice
const peopleRouter = pipe(
  literal('people'),
  Route.query(
    Schema.Struct({
      searchText: Schema.OptionFromOptional(Schema.String),
    }),
  ),
  Route.mapTo(AppRoute.People),
)

// Matches: /people/42
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(AppRoute.Person),
)
