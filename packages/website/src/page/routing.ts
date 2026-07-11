import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../prose'
import {
  bestPracticesKeyingRouter,
  coreManagedResourcesRouter,
  coreSubscriptionsRouter,
  exampleDetailRouter,
  patternsInformingSubmodelsRouter,
} from '../route'
import * as Snippet from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

const biparserHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'biparser',
  text: 'The Biparser Approach',
}

const definingRoutesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'defining-routes',
  text: 'Defining Routes',
}

const buildingRoutersHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'building-routers',
  text: 'Building Routers',
}

const parsingUrlsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'parsing-urls',
  text: 'Parsing URLs',
}

const buildingUrlsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'building-urls',
  text: 'Building URLs',
}

const queryParametersHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'query-parameters',
  text: 'Query Parameters',
}

const schemaSegmentsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'schema-segments',
  text: 'Schema Segments',
}

const restSegmentsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'rest-segments',
  text: 'Rest Segments',
}

const keyingRouteViewsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keying-route-views',
  text: 'Keying Route Views',
}

const navigationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'navigation',
  text: 'Navigation',
}

const coldLoadsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'cold-loads',
  text: 'Cold Loads and the Initial Route',
}

const routeTransitionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'route-transitions',
  text: 'Route Transitions',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  biparserHeader,
  definingRoutesHeader,
  buildingRoutersHeader,
  parsingUrlsHeader,
  buildingUrlsHeader,
  queryParametersHeader,
  schemaSegmentsHeader,
  restSegmentsHeader,
  keyingRouteViewsHeader,
  navigationHeader,
  coldLoadsHeader,
  routeTransitionsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('routing-and-navigation', 'Routing & Navigation'),
      para(
        'Foldkit uses a bidirectional routing system where you define routes once and use them for both parsing URLs and building URLs. No more keeping route matchers and URL builders in sync.',
      ),
      tableOfContentsEntryToHeader(biparserHeader),
      para(
        'Most routers make you define routes twice: once for matching URLs, and again for generating them. This leads to duplication and bugs when they get out of sync.',
      ),
      para(
        'Foldkit’s routing is based on biparsers: parsers that work in both directions. A single route definition handles:',
      ),
      h.ul(
        [h.Class('list-disc mb-6 space-y-2')],
        [
          h.li(
            [],
            [
              inlineCode('/people/42'),
              ' → ',
              inlineCode('PersonRoute { personId: 42 }'),
              ' (parsing)',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('PersonRoute { personId: 42 }'),
              ' → ',
              inlineCode('/people/42'),
              ' (building)',
            ],
          ),
        ],
      ),
      para(
        'This symmetry means if you can parse a URL into data, you can always build that data back into the same URL.',
      ),
      tableOfContentsEntryToHeader(definingRoutesHeader),
      para(
        'Routes are defined as tagged unions using ',
        link(Link.effectSchema, 'Effect Schema'),
        '. Each route variant carries the data extracted from the URL.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingDefineRoutesHighlighted),
          ],
          [],
        ),
        Snippet.routingDefineRoutesRaw,
        'Copy route definitions to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      h.ul(
        [h.Class('list-none mb-6 space-y-2')],
        [
          h.li([], [inlineCode('HomeRoute'), ': no parameters']),
          h.li(
            [],
            [
              inlineCode('PersonRoute'),
              ': holds a ',
              inlineCode('personId: number'),
            ],
          ),
          h.li(
            [],
            [
              inlineCode('PeopleRoute'),
              ': holds an optional ',
              inlineCode('searchText: Option<string>'),
            ],
          ),
          h.li(
            [],
            [
              inlineCode('NotFoundRoute'),
              ': holds the unmatched ',
              inlineCode('path: string'),
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(buildingRoutersHeader),
      para(
        'Routers are built by composing small primitives. Each primitive is a biparser that handles one part of the URL.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingBuildRoutersHighlighted),
          ],
          [],
        ),
        Snippet.routingBuildRoutersRaw,
        'Copy router definitions to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('The primitives:'),
      h.ul(
        [h.Class('list-nonw mb-6 space-y-2')],
        [
          h.li(
            [],
            [
              inlineCode("literal('people')"),
              ': matches the exact segment ',
              inlineCode('people'),
            ],
          ),
          h.li(
            [],
            [inlineCode("int('personId')"), ': captures an integer parameter'],
          ),
          h.li(
            [],
            [inlineCode("string('name')"), ': captures a string parameter'],
          ),
          h.li(
            [],
            [
              inlineCode("schemaSegment('personId', PersonId)"),
              ': captures a segment decoded through a Schema',
            ],
          ),
          h.li(
            [],
            [inlineCode("rest('path')"), ': captures all remaining segments'],
          ),
          h.li(
            [],
            [
              inlineCode("restString('path')"),
              ': captures all remaining segments as one path string',
            ],
          ),
          h.li(
            [],
            [inlineCode('slash(...)'), ': chains path segments together'],
          ),
          h.li(
            [],
            [
              inlineCode('Route.query(Schema)'),
              ': adds query parameter parsing',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('Route.mapTo(RouteType)'),
              ': converts parsed data into a typed route',
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(parsingUrlsHeader),
      para(
        'Combine routers with ',
        inlineCode('Route.oneOf'),
        ' and create a parser with a fallback for unmatched URLs.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.routingParsingHighlighted)],
          [],
        ),
        Snippet.routingParsingRaw,
        'Copy URL parsing example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'A router only matches when it consumes the entire URL, so routes that share a prefix do not conflict. ',
        inlineCode('/people'),
        ' and ',
        inlineCode('/people/:id'),
        ' can appear in any order. When several routes fully match the same URL, the first one wins. That only happens when route shapes overlap, like a ',
        inlineCode("literal('new')"),
        ' page next to a ',
        inlineCode("string('username')"),
        ' profile: ',
        inlineCode('/users/new'),
        ' satisfies both, so list the literal route first.',
      ),
      tableOfContentsEntryToHeader(buildingUrlsHeader),
      para(
        'Here’s where the biparser pays off. The same router that parses URLs can build them:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.routingBuildingHighlighted)],
          [],
        ),
        Snippet.routingBuildingRaw,
        'Copy URL building example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'TypeScript ensures you provide the correct data. If ',
        inlineCode('personRouter'),
        ' expects ',
        inlineCode('{ personId: number }'),
        ', you can’t accidentally pass a string or forget the parameter.',
      ),
      tableOfContentsEntryToHeader(queryParametersHeader),
      para(
        'Query parameters use ',
        link(Link.effectSchema, 'Effect Schema'),
        ' for validation. This gives you type-safe parsing, optional parameters, and automatic encoding/decoding.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingQueryParamsHighlighted),
          ],
          [],
        ),
        Snippet.routingQueryParamsRaw,
        'Copy query parameters example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('S.OptionFromOptional'),
        ' makes parameters optional. Missing params become ',
        inlineCode('Option.none()'),
        '. ',
        inlineCode('S.FiniteFromString'),
        ' automatically parses string query values into numbers.',
      ),
      para(
        'For a complete routing example, see the ',
        link(
          exampleDetailRouter({ exampleSlug: 'routing' }),
          'Routing example',
        ),
        '. For a deeper look at query parameters (custom schema transforms, lenient parsing, and bidirectional URL sync), see the ',
        link(
          exampleDetailRouter({ exampleSlug: 'query-sync' }),
          'Query Sync example',
        ),
        '.',
      ),
      tableOfContentsEntryToHeader(schemaSegmentsHeader),
      para(
        inlineCode('int'),
        ' and ',
        inlineCode('string'),
        ' capture a segment as a bare ',
        inlineCode('number'),
        ' or ',
        inlineCode('string'),
        '. When a segment is really a domain id, ',
        inlineCode('schemaSegment'),
        ' decodes it through an ',
        link(Link.effectSchema, 'Effect Schema'),
        ' instead, so the route carries the schema’s type. A branded ',
        inlineCode('PersonId'),
        ' flows straight into the model, where it can’t be passed anywhere a different id or a bare ',
        inlineCode('number'),
        ' is expected.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingSchemaSegmentHighlighted),
          ],
          [],
        ),
        Snippet.routingSchemaSegmentRaw,
        'Copy schema segments example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Whether a segment decodes is the route’s match test, and the decoded value is what the route carries when it passes. ',
        inlineCode('int'),
        ' already works this way: it claims ',
        inlineCode('/users/42'),
        ' but not ',
        inlineCode('/users/banana'),
        '. ',
        inlineCode('schemaSegment'),
        ' generalizes that to any rule a schema can express, from a UUID pattern to a fixed set of string literals. Refine a ',
        inlineCode('ProductId'),
        ' to a UUID and the route matches a real one but declines ',
        inlineCode('/products/banana'),
        ', so a malformed id falls through to the next route in ',
        inlineCode('oneOf'),
        ' (or to not-found) rather than reaching a component that has to handle it. Refinement and a brand compose, so one segment is both validated and carried as a distinct type.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingSchemaSegmentRefinementHighlighted),
          ],
          [],
        ),
        Snippet.routingSchemaSegmentRefinementRaw,
        'Copy schema refinement example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The schema’s encoded form must be a single segment string, and ',
        inlineCode('schemaSegment'),
        ' runs it both ways: it decodes when parsing and encodes when building, so the route still round-trips. For values that span several segments use ',
        inlineCode('rest'),
        ', and for values in the query string use ',
        inlineCode('Route.query'),
        '.',
      ),
      tableOfContentsEntryToHeader(restSegmentsHeader),
      para(
        'Some routes carry a whole path as data: a file tree, a documentation page, a breadcrumb trail. ',
        inlineCode('rest'),
        ' captures every remaining segment as a named field, the feature other routers call catch-all or splat routes. The parsed value is a non-empty array of strings, so the route schema declares the field with ',
        inlineCode('S.NonEmptyArray(S.String)'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.routingRestHighlighted)],
          [],
        ),
        Snippet.routingRestRaw,
        'Copy rest segments example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('rest'),
        ' requires at least one segment, so the bare prefix ',
        inlineCode('/files'),
        ' does not match the rest route. Give the prefix its own route, like ',
        inlineCode('FilesIndexRoute'),
        ' above. The two never overlap: one matches exactly ',
        inlineCode('/files'),
        ', the other matches anything beneath it.',
      ),
      para(
        'A specific route under the same prefix is different. The rest route also matches every URL that ',
        inlineCode("literal('files'), slash(literal('shared'))"),
        ' accepts, so in ',
        inlineCode('oneOf'),
        ' the specific route must come first.',
      ),
      para(
        'Nothing can follow ',
        inlineCode('rest'),
        ' in the path, so ',
        inlineCode('slash'),
        ' cannot extend it. TypeScript rejects the composition. ',
        inlineCode('query'),
        ' can still follow, since query parameters live after the path.',
      ),
      para(
        'When the path itself is the value, ',
        inlineCode('restString'),
        ' captures the same tail as a single string, slashes included, so the route schema declares the field with ',
        inlineCode('S.String'),
        '. A repository-relative file path like ',
        inlineCode('20-upgrade/teach/the-elm-architecture.md'),
        ' round-trips as one value instead of an array of segments.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingRestStringHighlighted),
          ],
          [],
        ),
        Snippet.routingRestStringRaw,
        'Copy restString example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Everything above about ',
        inlineCode('rest'),
        ' applies to ',
        inlineCode('restString'),
        ' as well: it requires at least one segment, a more specific route under the same prefix must come first in ',
        inlineCode('oneOf'),
        ', and nothing can follow it in the path. Building requires a normalized path, non-empty with no leading, trailing, or repeated slashes. Any other value would build a URL that parses back differently, so the build fails instead.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'routing' }),
          'Routing example',
        ),
        ' uses a rest route to drive a small file browser, building breadcrumb and directory links from the captured segments.',
      ),
      tableOfContentsEntryToHeader(keyingRouteViewsHeader),
      warningCallout(
        'Always key your route content.',
        'Without a key, the virtual DOM will try to patch one route’s DOM into another instead of replacing it. This causes stale input state, mismatched event handlers, and bugs that are extremely hard to track down.',
      ),
      para(
        'Wrap your route content in a ',
        inlineCode('keyed'),
        ' element using ',
        inlineCode('model.route._tag'),
        ' as the key. This tells Snabbdom that each route is a distinct tree that should be fully replaced on navigation.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.routingKeyedHighlighted)],
          [],
        ),
        Snippet.routingKeyedRaw,
        'Copy keyed route example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Route views are the most common case, but keying applies anywhere the view branches into structurally different trees. See ',
        link(bestPracticesKeyingRouter(), 'Keying'),
        ' in Best Practices for layout branches, model state branches, and what happens under the hood.',
      ),
      tableOfContentsEntryToHeader(navigationHeader),
      para(
        'Foldkit provides navigation Commands for programmatically changing the URL. These are returned from your update function like any other Command.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.navigationCommandsHighlighted),
          ],
          [],
        ),
        Snippet.navigationCommandsRaw,
        'Copy navigation commands to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      h.ul(
        [h.Class('list-none mb-6 space-y-2')],
        [
          h.li(
            [],
            [
              inlineCode('Navigation.pushUrl'),
              ': adds a new entry to browser history',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('Navigation.replaceUrl'),
              ': replaces the current history entry (no back button)',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('Navigation.back'),
              ' / ',
              inlineCode('Navigation.forward'),
              ': navigate through browser history',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('Navigation.load'),
              ': full page load (for external URLs)',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('Navigation.openUrl'),
              ': opens an external URL in a new browsing context (tab or window), leaving the current page untouched',
            ],
          ),
        ],
      ),
      para(
        'When a link is clicked in your application, the ',
        inlineCode('browser.onUrlRequest'),
        ' handler receives either an Internal or External request. Handle Internal links with ',
        inlineCode('pushUrl'),
        ' and External links with ',
        inlineCode('load'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.navigationHandleUrlRequestHighlighted),
          ],
          [],
        ),
        Snippet.navigationHandleUrlRequestRaw,
        'Copy URL request handling to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'After ',
        inlineCode('pushUrl'),
        ' or ',
        inlineCode('replaceUrl'),
        ' changes the URL, Foldkit automatically calls your ',
        inlineCode('browser.onUrlChange'),
        ' handler with the new URL. This is where you parse the URL into a route and update your model.',
      ),
      tableOfContentsEntryToHeader(coldLoadsHeader),
      para(
        inlineCode('onUrlChange'),
        ' fires when the URL changes after boot. On a cold load (a direct visit, a bookmark, a reload) there is no change to report: ',
        inlineCode('init'),
        ' receives the initial URL, parses it, and seeds the Model with the starting route. Foldkit does not synthesize a ',
        inlineCode('ChangedUrl'),
        ' for it, because the initial route is starting state, not a transition.',
      ),
      warningCallout(
        'Don’t wire route fetches into navigation alone.',
        'A fetch Command returned only from the ',
        inlineCode('ChangedUrl'),
        ' handler fires on every in-app navigation and never on a cold load. During development you reach every route by clicking from the home page, so everything works. Then a user reloads on a sub-route or follows a bookmark and lands on a Model stuck in its initial state, with no fetch in flight.',
      ),
      para(
        'Both code paths resolve a URL into a route, and both should produce the same route-driven Commands. Factor those Commands into one helper and call it from both places:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.routingColdLoadHighlighted)],
          [],
        ),
        Snippet.routingColdLoadRaw,
        'Copy cold load example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When the route-driven state lives in a Submodel, the same factoring follows the Submodel boundary instead of a shared helper: the Submodel’s ',
        inlineCode('init(route)'),
        ' seeds its state and returns the boot Commands for the cold load, and its ',
        inlineCode('informRouteChanged'),
        ' helper covers later transitions. ',
        link(patternsInformingSubmodelsRouter(), 'Informing Submodels'),
        ' shows that shape, and the ',
        link(
          exampleDetailRouter({ exampleSlug: 'routing' }),
          'Routing example',
        ),
        ' runs on it.',
      ),
      tableOfContentsEntryToHeader(routeTransitionsHeader),
      para(
        'The shared helper above answers what a route needs, so its Commands fire on every navigation that lands on the route. For ',
        inlineCode('FetchPeople'),
        ' that is the point: every search text is a new query. Other Commands should run once when the user arrives, loading a filter catalog, starting a poll, recording a page view. For those the route alone cannot answer the real question: did this navigation enter the route, or was the application already there?',
      ),
      para(
        'The ',
        inlineCode('Transition'),
        ' namespace in ',
        inlineCode('foldkit/route'),
        ' answers it. A ',
        inlineCode('Transition.Transition'),
        ' carries both halves of the question: the route the application was on and the route it is on now. ',
        inlineCode('Transition.make(previousRoute, nextRoute)'),
        ' builds the navigation case, ',
        inlineCode('Transition.coldLoad(nextRoute)'),
        ' builds the cold load, where there is no previous route, and ',
        inlineCode('Transition.isEntering'),
        ' asks the question: a transition enters a route when the next route carries the tag and the previous route did not, and a cold load counts as an entry. Navigating within a route, between two ids of one detail route or two search texts of one list route, is not an entry.',
      ),
      para(
        'The route union is inferred from the transition argument and the tag is checked against it, so a misspelled route name fails to compile. Build the transition in the same two places that resolve a URL into a route: ',
        inlineCode('init'),
        ' holds no route yet, so it builds the cold load, and the ',
        inlineCode('ChangedUrl'),
        ' handler transitions from the route the Model still holds:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingIsEnteringHighlighted),
          ],
          [],
        ),
        Snippet.routingIsEnteringRaw,
        'Copy isEntering example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'One route checks cleanly with a predicate. When several routes have entry Commands, ask the transition which route it entered instead: ',
        inlineCode('Transition.entered'),
        ' returns the entered route in a ',
        inlineCode('Some'),
        ', payload included, and ',
        inlineCode('Option.none()'),
        ' when the transition stayed within one route. Match on the result to dispatch every entry policy in one place:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.routingEnteredHighlighted)],
          [],
        ),
        Snippet.routingEnteredRaw,
        'Copy entered example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When a single route owns the entry Command and needs the route’s payload, skip the dispatch: ',
        inlineCode('Transition.enteredRoute(transition, tag)'),
        ' returns the entered route narrowed to the tag, so the payload arrives typed:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingEnteredRouteHighlighted),
          ],
          [],
        ),
        Snippet.routingEnteredRouteRaw,
        'Copy enteredRoute example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Entering has a mirror. ',
        inlineCode('Transition.exited'),
        ' returns the route the transition left, and ',
        inlineCode('Transition.exitedRoute(transition, tag)'),
        ' is its single-route, payload-carrying form. Exits are for one-shot Commands on the way out, saving a draft, recording that a visit ended. They are not for tearing down things that live while a route is active: listeners, timers, and handles belong to a ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' or ',
        link(coreManagedResourcesRouter(), 'ManagedResource'),
        ' condition on the Model, which also ends them when the route state disappears for reasons other than navigation.',
      ),
      para(
        'The last case is staying. ',
        inlineCode('Transition.stayed(transition, tag)'),
        ' returns both sides of a within-route navigation, narrowed to the tag: ',
        inlineCode('Some({ previousRoute, nextRoute })'),
        ' when the transition stayed on that route, ',
        inlineCode('Option.none()'),
        ' when it entered it, left it, or never touched it. A cold load stays nowhere. Reach for it when the previous payload matters, comparing a detail id or diffing query parameters; when only the next value matters, the ',
        inlineCode('ChangedUrl'),
        ' handler already has the next route.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.routingExitedStayedHighlighted),
          ],
          [],
        ),
        Snippet.routingExitedStayedRaw,
        'Copy exited and stayed example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Because a cold load counts as an entry, ',
        inlineCode('init'),
        ' and the ',
        inlineCode('ChangedUrl'),
        ' handler share one load-on-entry policy: reloading on ',
        inlineCode('/people'),
        ' runs the same entry Commands as clicking there from the home page. Transition helpers compose by concatenation, as above; a handler that mixes entry, exit, and per-navigation Commands flattens their results into one batch.',
      ),
    ],
  )
}
