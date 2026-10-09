---
'foldkit': minor
---

Let `Route.mapTo` take a route whose fields carry `Schema.withConstructorDefault`. Before, a router such as `pipe(Route.root, Route.query(...), Route.mapTo(AppRoute.Search))` did not typecheck when a field of `Search` had a constructor default, because `mapTo` asked the parser to print the constructor input, where that field is optional. `mapTo` now asks for a parser that produces a value the constructor accepts and prints the payload of the route the constructor returns, which is the value a router builds URLs from.

Every route variant from `defineRouteUnion` that typechecked with `mapTo` before still typechecks. A hand-written `{ make }` constructor whose return value does not fit its own input no longer typechecks, because building a URL passes that return value to the parser's printer. Change such a constructor so that the route value it returns is also a valid input.
