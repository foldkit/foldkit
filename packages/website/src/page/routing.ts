import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../prose'
import { bestPracticesRouter, exampleDetailRouter } from '../route'
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

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
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
        'Foldkit\u2019s routing is based on biparsers — parsers that work in both directions. A single route definition handles:',
      ),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              inlineCode('/people/42'),
              ' → ',
              inlineCode('PersonRoute { personId: 42 }'),
              ' (parsing)',
            ],
          ),
          li(
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
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.routingDefineRoutesHighlighted),
          ],
          [],
        ),
        Snippets.routingDefineRoutesRaw,
        'Copy route definitions to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      ul(
        [Class('list-none mb-6 space-y-2')],
        [
          li([], [inlineCode('HomeRoute'), ' — no parameters']),
          li(
            [],
            [
              inlineCode('PersonRoute'),
              ' — holds a ',
              inlineCode('personId: number'),
            ],
          ),
          li(
            [],
            [
              inlineCode('PeopleRoute'),
              ' — holds an optional ',
              inlineCode('searchText: Option<string>'),
            ],
          ),
          li(
            [],
            [
              inlineCode('NotFoundRoute'),
              ' — holds the unmatched ',
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
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.routingBuildRoutersHighlighted),
          ],
          [],
        ),
        Snippets.routingBuildRoutersRaw,
        'Copy router definitions to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('The primitives:'),
      ul(
        [Class('list-nonw mb-6 space-y-2')],
        [
          li(
            [],
            [
              inlineCode("literal('people')"),
              ' — matches the exact segment ',
              inlineCode('people'),
            ],
          ),
          li(
            [],
            [inlineCode("int('personId')"), ' — captures an integer parameter'],
          ),
          li(
            [],
            [inlineCode("string('name')"), ' — captures a string parameter'],
          ),
          li(
            [],
            [inlineCode('slash(...)'), ' — chains path segments together'],
          ),
          li(
            [],
            [
              inlineCode('Route.query(Schema)'),
              ' — adds query parameter parsing',
            ],
          ),
          li(
            [],
            [
              inlineCode('Route.mapTo(RouteType)'),
              ' — converts parsed data into a typed route',
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
        div(
          [Class('text-sm'), InnerHTML(Snippets.routingParsingHighlighted)],
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
        '. Put more specific routes first — ',
        inlineCode('/people/:id'),
        ' should come before ',
        inlineCode('/people'),
        ' so the parameter route gets a chance to match.',
      ),
      tableOfContentsEntryToHeader(buildingUrlsHeader),
      para(
        'Here\u2019s where the biparser pays off. The same router that parses URLs can build them:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.routingBuildingHighlighted)],
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
        ', you can\u2019t accidentally pass a string or forget the parameter.',
      ),
      tableOfContentsEntryToHeader(queryParametersHeader),
      para(
        'Query parameters use ',
        link(Link.effectSchema, 'Effect Schema'),
        ' for validation. This gives you type-safe parsing, optional parameters, and automatic encoding/decoding.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.routingQueryParamsHighlighted)],
          [],
        ),
        Snippets.routingQueryParamsRaw,
        'Copy query parameters example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('S.OptionFromUndefinedOr'),
        ' makes parameters optional — missing params become ',
        inlineCode('Option.none()'),
        '. ',
        inlineCode('S.NumberFromString'),
        ' automatically parses string query values into numbers.',
      ),
      para(
        'For a complete routing example, see the ',
        link(
          exampleDetailRouter({ exampleSlug: 'routing' }),
          'Routing example',
        ),
        '. For a deeper look at query parameters — custom schema transforms, lenient parsing, and bidirectional URL sync — see the ',
        link(
          exampleDetailRouter({ exampleSlug: 'query-sync' }),
          'Query Sync example',
        ),
        '.',
      ),
      tableOfContentsEntryToHeader(keyingRouteViewsHeader),
      warningCallout(
        'Always key your route content.',
        'Without a key, the virtual DOM will try to patch one route\u2019s DOM into another instead of replacing it. This causes stale input state, mismatched event handlers, and bugs that are extremely hard to track down.',
      ),
      para(
        'Wrap your route content in a ',
        inlineCode('keyed'),
        ' element using ',
        inlineCode('model.route._tag'),
        ' as the key. This tells Snabbdom that each route is a distinct tree that should be fully replaced on navigation.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.routingKeyedHighlighted)],
          [],
        ),
        Snippets.routingKeyedRaw,
        'Copy keyed route example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Route views are the most common case, but keying applies anywhere the view branches into structurally different trees. See ',
        link(`${bestPracticesRouter()}#keying`, 'Keying'),
        ' in Best Practices for layout branches, model state branches, and what happens under the hood.',
      ),
      tableOfContentsEntryToHeader(navigationHeader),
      para(
        'Foldkit provides navigation commands for programmatically changing the URL. These are returned from your update function like any other command.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.navigationCommandsHighlighted)],
          [],
        ),
        Snippets.navigationCommandsRaw,
        'Copy navigation commands to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      ul(
        [Class('list-none mb-6 space-y-2')],
        [
          li(
            [],
            [
              inlineCode('Navigation.pushUrl'),
              ' — adds a new entry to browser history',
            ],
          ),
          li(
            [],
            [
              inlineCode('Navigation.replaceUrl'),
              ' — replaces the current history entry (no back button)',
            ],
          ),
          li(
            [],
            [
              inlineCode('Navigation.back'),
              ' / ',
              inlineCode('Navigation.forward'),
              ' — navigate through browser history',
            ],
          ),
          li(
            [],
            [
              inlineCode('Navigation.load'),
              ' — full page load (for external URLs)',
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
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.navigationHandleUrlRequestHighlighted),
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
