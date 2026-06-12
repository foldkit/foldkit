import { Route, Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// Combine routers. A route matches only when it consumes the whole URL.
const routeParser = Route.oneOf(
  personRouter, // /people/:id
  peopleRouter, // /people?search=...
  homeRouter, // /
)

// Create a parser with a fallback for unmatched URLs
const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// In your init function, parse the initial URL:
const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url) => {
  return [{ route: urlToAppRoute(url) }, []]
}

// In your update function, handle URL changes:
ChangedUrl: ({ url }) => [
  evo(model, {
    route: () => urlToAppRoute(url),
  }),
  [],
]
