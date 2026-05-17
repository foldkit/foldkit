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
import { bestPracticesKeyingRouter, exampleDetailRouter } from '../route'
import * as Snippets from '../snippet'
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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  biparserHeader,
  definingRoutesHeader,
  buildingRoutersHeader,
  parsingUrlsHeader,
  buildingUrlsHeader,
  queryParametersHeader,
  keyingRouteViewsHeader,
  navigationHeader,
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
            h.InnerHTML(Snippets.routingDefineRoutesHighlighted),
          ],
          [],
        ),
        Snippets.routingDefineRoutesRaw,
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
            h.InnerHTML(Snippets.routingBuildRoutersHighlighted),
          ],
          [],
        ),
        Snippets.routingBuildRoutersRaw,
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
          [h.Class('text-sm'), h.InnerHTML(Snippets.routingParsingHighlighted)],
          [],
        ),
        Snippets.routingParsingRaw,
        'Copy URL parsing example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Order matters in ',
        inlineCode('oneOf'),
        '. Put more specific routes first. ',
        inlineCode('/people/:id'),
        ' should come before ',
        inlineCode('/people'),
        ' so the parameter route gets a chance to match.',
      ),
      tableOfContentsEntryToHeader(buildingUrlsHeader),
      para(
        'Here’s where the biparser pays off. The same router that parses URLs can build them:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.routingBuildingHighlighted),
          ],
          [],
        ),
        Snippets.routingBuildingRaw,
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
            h.InnerHTML(Snippets.routingQueryParamsHighlighted),
          ],
          [],
        ),
        Snippets.routingQueryParamsRaw,
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
          [h.Class('text-sm'), h.InnerHTML(Snippets.routingKeyedHighlighted)],
          [],
        ),
        Snippets.routingKeyedRaw,
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
            h.InnerHTML(Snippets.navigationCommandsHighlighted),
          ],
          [],
        ),
        Snippets.navigationCommandsRaw,
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
            h.InnerHTML(Snippets.navigationHandleUrlRequestHighlighted),
          ],
          [],
        ),
        Snippets.navigationHandleUrlRequestRaw,
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
    ],
  )
}
