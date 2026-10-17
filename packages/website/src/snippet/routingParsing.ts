import { Route } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'

// Combine routers. A route matches only when it consumes the whole URL.
const routeParser = Route.oneOf(
  personRouter, // /people/:id
  peopleRouter, // /people?search=...
  homeRouter, // /
)

// Create a parser with a fallback for unmatched URLs
const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

// In your init function, parse the initial URL:
const init = ApplicationComposition.makeInit((url: Url) => {
  return { model: { route: urlToApplicationRoute(url) } }
})

// In your update function, handle URL changes:
ChangedUrl: ({ url }) => ({
  model: modifyFields(model, {
    route: () => urlToApplicationRoute(url),
  }),
})
