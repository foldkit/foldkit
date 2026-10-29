import { parsePathWithFallback } from 'foldkit/route'

import {
  ApplicationRoute,
  parsePath,
  personRouter,
} from './route-path.accepted.js'

// @ts-expect-error Relative path inputs are strings.
parsePath(42)

// @ts-expect-error Parsing can return the fallback Route.
const person: typeof ApplicationRoute.Person.Type = parsePath('/people/ada')
void person

parsePathWithFallback(personRouter, {
  // @ts-expect-error The fallback receives the original string path.
  make: ({ path }: { path: number }) => ({ path }),
})

// @ts-expect-error A Route constructor does not implement a parser.
parsePathWithFallback(ApplicationRoute.Person, ApplicationRoute.NotFound)
