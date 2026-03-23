import { Route, Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// Combine routers - order matters! More specific routes first.
const routeParser = Route.oneOf(
  personRouter, // /people/:id - try first (more specific)
  peopleRouter, // /people?search=...
  homeRouter, // /
)

// Create a parser with a fallback for unmatched URLs
const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// In your init function, parse the initial URL:
const init: Runtime.RoutingProgramInit<Model, Message> = (url: Url) => {
  return [{ route: urlToAppRoute(url) }, []]
}

// In your update function, handle URL changes:
UrlChanged: ({ url }) => [
  evo(model, {
    route: () => urlToAppRoute(url),
  }),
  [],
]
