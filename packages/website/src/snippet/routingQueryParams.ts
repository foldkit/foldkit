import { Option, Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

// Query parameters use Effect Schema for validation
const searchRouter = pipe(
  literal('search'),
  Route.query(
    Schema.Struct({
      q: Schema.OptionFromOptional(Schema.String),
      page: Schema.OptionFromOptional(Schema.FiniteFromString),
      sort: Schema.OptionFromOptional(Schema.Literals(['Asc', 'Desc'])),
    }),
  ),
  Route.mapTo(AppRoute.Search),
)

// Parsing /search?q=hello&page=2&sort=asc gives you:
// → AppRoute.Search { q: Some('hello'), page: Some(2), sort: Some('Asc') }

// Building
const searchUrl = searchRouter({
  q: Option.some('hello'),
  page: Option.some(2),
  sort: Option.none(),
})
console.log(searchUrl)
// '/search?q=hello&page=2'
