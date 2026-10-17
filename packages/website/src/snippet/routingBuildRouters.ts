import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { int, literal, slash } from 'foldkit/route'

// Matches: /
const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

// Matches: /people or /people?searchText=alice
const peopleRouter = pipe(
  literal('people'),
  Route.query(
    Schema.Struct({
      searchText: Schema.OptionFromOptional(Schema.String),
    }),
  ),
  Route.mapTo(ApplicationRoute.People),
)

// Matches: /people/42
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(ApplicationRoute.Person),
)
