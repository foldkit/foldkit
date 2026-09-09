# Routing & Navigation

Foldkit uses a bidirectional routing system where you define routes once and use them for both parsing URLs and building URLs. No more keeping route matchers and URL builders in sync. This page introduces the pieces in the order you reach for them; the [Route API reference](/api-reference/route) has the exhaustive catalog of combinators, and the [Route Transition API reference](/api-reference/route-transition) covers the transition helpers.

## The Biparser Approach {#biparser}

Most routers make you define routes twice: once for matching URLs, and again for generating them. This leads to duplication and bugs when they get out of sync.

Foldkit’s routing is based on biparsers: parsers that work in both directions. A single route definition handles:

- `/people/42` → `AppRoute.Person { personId: 42 }` (parsing)
- `AppRoute.Person { personId: 42 }` → `/people/42` (building)

This symmetry means if you can parse a URL into data, you can always build that data back into the same URL.

## Defining Routes

`defineRouteUnion` declares every application Route together. Each key is a tag, and its value lists the fields parsed from the URL. `AppRoute` is also an [Effect Schema](https://effect.website/docs/schema/introduction/), so it can be stored in the Model and used to decode unknown values.

::Snippet{name="routingDefineRoutes" label="route definitions"}

- `AppRoute.Home`: no parameters
- `AppRoute.Person`: holds a `personId: number`
- `AppRoute.People`: holds an optional `searchText: Option<string>`
- `AppRoute.NotFound`: holds the unmatched `path: string`

Keep each variant on `AppRoute`, just as Message variants stay on `Message`. `AppRoute.Person({ personId: 42 })` constructs a Route, while `Route.mapTo(AppRoute.Person)` uses the same variant as a Schema.

Use `AppRoute.match` when every Route needs a branch. Use `AppRoute.isAnyOf(['Blog', 'BlogPost'])` when one check accepts several tags.

If a Model or Schema accepts only some application Routes, create that Schema with `subset`:

::Snippet{name="routingSubset" label="Route subset example"}

`subset` includes only the tags you name. If you add a Route to `AppRoute` later, `TopLevelRoute` will not accept it until you add its tag. There is no `omit`: an exclusion list would silently accept every Route added later.

If a module needs to name one variant's type, add an alias beside `AppRoute`: `export type NewsletterRoute = typeof AppRoute.Newsletter.Type`.

## Building Routers

Routers are built by composing small primitives. Each primitive is a biparser that handles one part of the URL.

::Snippet{name="routingBuildRouters" label="router definitions"}

The primitives:

- `literal('people')`: matches the exact segment `people`
- `int('personId')`: captures an integer parameter
- `string('name')`: captures a string parameter
- `schemaSegment('personId', PersonId)`: captures a segment decoded through a Schema
- `rest('path')`: captures all remaining segments
- `restString('path')`: captures all remaining segments as one path string
- `slash(...)`: chains path segments together
- `Route.query(Schema)`: adds query parameter parsing
- `Route.mapTo(AppRoute.Person)`: converts parsed data into a typed route

## Parsing URLs

Combine routers with `Route.oneOf` and create a parser with a fallback for unmatched URLs.

::Snippet{name="routingParsing" label="URL parsing example"}

A router only matches when it consumes the entire URL, so routes that share a prefix do not conflict. `/people` and `/people/:id` can appear in any order. When several routes fully match the same URL, the first one wins. That only happens when route shapes overlap, like a `literal('new')` page next to a `string('username')` profile: `/users/new` satisfies both, so list the literal route first.

## Building URLs

Here’s where the biparser pays off. The same router that parses URLs can build them:

::Snippet{name="routingBuilding" label="URL building example"}

TypeScript ensures you provide the correct data. If `personRouter` expects `{ personId: number }`, you can’t accidentally pass a string or forget the parameter.

## Query Parameters

Query parameters use [Effect Schema](https://effect.website/docs/schema/introduction/) for validation. This gives you type-safe parsing, optional parameters, and automatic encoding/decoding.

::Snippet{name="routingQueryParams" label="query parameters example"}

`Schema.OptionFromOptional` makes parameters optional. Missing params become `Option.none()`. `Schema.FiniteFromString` automatically parses string query values into numbers.

For a complete routing example, see the [Routing example](/example-apps/routing). For a deeper look at query parameters (custom schema transforms, lenient parsing, and bidirectional URL sync), see the [Query Sync example](/example-apps/query-sync).

## Schema Segments

`int` and `string` capture a segment as a bare `number` or `string`. When a segment is really a domain id, `schemaSegment` decodes it through an [Effect Schema](https://effect.website/docs/schema/introduction/) instead, so the route carries the schema’s type. A branded `PersonId` flows straight into the Model, where it can’t be passed anywhere a different id or a bare `number` is expected.

::Snippet{name="routingSchemaSegment" label="schema segments example"}

Whether a segment decodes is the route’s match test, and the decoded value is what the route carries when it passes. `int` already works this way: it claims `/users/42` but not `/users/banana`. `schemaSegment` generalizes that to any rule a schema can express, from a UUID pattern to a fixed set of string literals. Refine a `ProductId` to a UUID and the route matches a real one but declines `/products/banana`, so a malformed id falls through to the next route in `oneOf` (or to not-found) rather than reaching a component that has to handle it. Refinement and a brand compose, so one segment is both validated and carried as a distinct type.

::Snippet{name="routingSchemaSegmentRefinement" label="schema refinement example"}

The schema’s encoded form must be a single segment string, and `schemaSegment` runs it both ways: it decodes when parsing and encodes when building, so the route still round-trips. For values that span several segments use `rest`, and for values in the query string use `Route.query`.

## Rest Segments

Some routes carry a whole path as data: a file tree, a documentation page, a breadcrumb trail. `rest` captures every remaining segment as a named field, the feature other routers call catch-all or splat routes. The parsed value is a non-empty array of strings, so the route schema declares the field with `Schema.NonEmptyArray(Schema.String)`.

::Snippet{name="routingRest" label="rest segments example"}

`rest` requires at least one segment, so the bare prefix `/files` does not match the rest route. Give the prefix its own route, like `AppRoute.FilesIndex` above. The two never overlap: one matches exactly `/files`, the other matches anything beneath it.

A specific route under the same prefix is different. The rest route also matches every URL that `literal('files'), slash(literal('shared'))` accepts, so in `oneOf` the specific route must come first.

Nothing can follow `rest` in the path, so `slash` cannot extend it. TypeScript rejects the composition. `query` can still follow, since query parameters live after the path.

When the path itself is the value, `restString` captures the same tail as a single string, slashes included, so the route schema declares the field with `Schema.String`. A repository-relative file path like `20-upgrade/teach/the-elm-architecture.md` round-trips as one value instead of an array of segments.

::Snippet{name="routingRestString" label="restString example"}

Everything above about `rest` applies to `restString` as well: it requires at least one segment, a more specific route under the same prefix must come first in `oneOf`, and nothing can follow it in the path. Building requires a normalized path, non-empty with no leading, trailing, or repeated slashes. Any other value would build a URL that parses back differently, so the build fails instead.

The [Routing example](/example-apps/routing) uses a rest route to drive a small file browser, building breadcrumb and directory links from the captured segments.

## Route View Identity

Each route arm delegates to its own view function, and view functions are identity boundaries: the build brands the VNodes a function returns with that function’s identity, and the differ replaces a position whose identity changed instead of patching it. Navigating from one route to another therefore tears down the old page and builds the new one fresh, with no keys and no wrapper elements. The identity is stamped by `@foldkit/vite-plugin`, which `create-foldkit-app` includes by default. Do not build a Foldkit app without it:

::Snippet{name="routingViewIdentity" label="route view identity example"}

Route views are the most common branch, but the same protection applies to any control flow that selects between view functions. See [Keying](/best-practices/keying) in Best Practices for the full identity model, list keys, and the edges that remain manual.

## Navigation

Foldkit provides navigation Commands for programmatically changing the URL. These are returned from your update function like any other Command.

::Snippet{name="navigationCommands" label="navigation commands"}

- `Navigation.pushUrl`: adds a new entry to browser history
- `Navigation.replaceUrl`: replaces the current history entry (no back button)
- `Navigation.back` / `Navigation.forward`: navigate through browser history
- `Navigation.load`: full page load (for external URLs)
- `Navigation.openUrl`: opens an external URL in a new browsing context (tab or window), leaving the current page untouched

When a link is clicked in your application, the `routing.onUrlRequest` handler receives either an Internal or External request. Handle Internal links with `pushUrl` and External links with `load`:

::Snippet{name="navigationHandleUrlRequest" label="URL request handling"}

After `pushUrl` or `replaceUrl` changes the URL, Foldkit automatically calls your `routing.onUrlChange` handler with the new URL. This is where you parse the URL into a route and update your model.

## Cold Loads and the Initial Route {#cold-loads}

`onUrlChange` fires when the URL changes after boot. On a cold load (a direct visit, a bookmark, a reload) there is no change to report: `init` receives the initial URL, parses it, and seeds the Model with the starting route. Foldkit does not synthesize a `ChangedUrl` for it, because the initial route is starting state, not a transition.

:::Warning{label="Don’t wire route fetches into navigation alone."}
A fetch Command returned only from the `ChangedUrl` handler fires on every in-app navigation and never on a cold load. During development you reach every route by clicking from the home page, so everything works. Then a user reloads on a sub-route or follows a bookmark and lands on a Model stuck in its initial state, with no fetch in flight.
:::

Both code paths resolve a URL into a route, and both should produce the same route-driven Commands. Factor those Commands into one helper and call it from both places:

::Snippet{name="routingColdLoad" label="cold load example"}

When the route-driven state lives in a Submodel, the same factoring follows the Submodel boundary instead of a shared helper: the Submodel’s `init(route)` seeds its state and returns the boot Commands for the cold load, and its `informRouteChanged` helper covers later transitions. [Informing Submodels](/patterns/informing-submodels) shows that shape, and the [Routing example](/example-apps/routing) runs on it.

## Route Transitions

The shared helper above answers what a route needs, so its Commands fire on every navigation that lands on the route. For `FetchPeople` that is the point: every search text is a new query. Other Commands should run once when the user arrives, loading a filter catalog, starting a poll, recording a page view. For those the route alone cannot answer the real question: did this navigation enter the route, or was the application already there?

The `Transition` namespace in `foldkit/route` answers it. A `Transition.Transition` carries both halves of the question: the route the application was on and the route it is on now. `Transition.make(previousRoute, nextRoute)` builds the navigation case, `Transition.coldLoad(nextRoute)` builds the cold load, where there is no previous route, and `Transition.isEntering` asks the question: a transition enters a route when the next route carries the tag and the previous route did not, and a cold load counts as an entry. Navigating within a route, between two ids of one detail route or two search texts of one list route, is not an entry.

The route union is inferred from the transition argument and the tag is checked against it, so a misspelled route name fails to compile. Build the transition in the same two places that resolve a URL into a route: `init` holds no route yet, so it builds the cold load, and the `ChangedUrl` handler transitions from the route the Model still holds:

::Snippet{name="routingIsEntering" label="isEntering example"}

A predicate answers whether, not which. When the entry Command needs the route’s payload, `Transition.entered(transition, tag)` returns the entered route narrowed to the tag, so a detail id arrives typed:

::Snippet{name="routingEntered" label="entered example"}

Every helper that takes a tag answers for one named route. When several routes have entry Commands, ask the transition which route it entered instead: `Transition.enteredAny` returns the entered route in a `Some`, whichever route that was, and `Option.none()` when the transition stayed within one route. Match on the result to dispatch every entry policy in one place:

::Snippet{name="routingEnteredAny" label="enteredAny example"}

Entering has a mirror. `Transition.exited(transition, tag)` returns the route the transition left, narrowed to the tag, and `Transition.exitedAny` is its whichever-route form. Exits are for one-shot Commands on the way out, saving a draft, recording that a visit ended. They are not for tearing down things that live while a route is active: listeners, timers, and handles belong to a [Subscription](/core/subscriptions) or [ManagedResource](/core/managed-resources) condition on the Model, which also ends them when the route state disappears for reasons other than navigation.

The last case is staying. `Transition.stayed(transition, tag)` returns both sides of a within-route navigation, narrowed to the tag: `Some({ previousRoute, nextRoute })` when the transition stayed on that route, `Option.none()` when it entered it, left it, or never touched it. A cold load stays nowhere. Reach for it when the previous payload matters, comparing a detail id or diffing query parameters; when only the next value matters, the `ChangedUrl` handler already has the next route. Staying has no whichever-route form: without a tag the two sides could not narrow to the same route variant together, so matching on one would leave the other typed as the whole union.

::Snippet{name="routingExitedStayed" label="exited and stayed example"}

Because a cold load counts as an entry, `init` and the `ChangedUrl` handler share one load-on-entry policy: reloading on `/people` runs the same entry Commands as clicking there from the home page. Transition helpers compose by concatenation, as above; a handler that mixes entry, exit, and per-navigation Commands flattens their results into one batch.

The [Route Transition API reference](/api-reference/route-transition) lists every helper with its full signature.
