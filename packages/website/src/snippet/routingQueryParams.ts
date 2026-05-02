import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal } from 'foldkit/route'

// Query parameters use Effect Schema for validation
const searchRouter = pipe(
  literal('search'),
  Route.query(
    S.Struct({
      q: S.OptionFromOptional(S.String),
      page: S.OptionFromOptional(S.FiniteFromString),
      sort: S.OptionFromOptional(S.Literals(['Asc', 'Desc'])),
    }),
  ),
  Route.mapTo(SearchRoute),
)

// Parsing /search?q=hello&page=2&sort=asc gives you:
// → SearchRoute { q: Some('hello'), page: Some(2), sort: Some('Asc') }

// Building
const searchUrl = searchRouter({
  q: Option.some('hello'),
  page: Option.some(2),
  sort: Option.none(),
})
console.log(searchUrl)
// '/search?q=hello&page=2'
