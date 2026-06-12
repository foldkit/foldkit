import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  bullets,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  bestPracticesKeyingRouter,
  coreDevToolsRouter,
  coreEmbeddingRouter,
  coreFreezeModelRouter,
  coreSlowViewRouter,
  coreViewMemoizationRouter,
  uiVirtualListRouter,
  whatAboutSsrRouter,
} from '../route'
import { comparisonTable } from '../view/table'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whereTheTimeGoesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'where-the-time-goes',
  text: 'Where the time goes',
}

const benchmarksHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'benchmarks',
  text: 'Benchmarks',
}

const readingTheNumbersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'reading-the-numbers',
  text: 'Reading the numbers',
}

const devModeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'development-mode-is-not-production',
  text: 'Development mode is not production',
}

const toolkitHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-optimization-toolkit',
  text: 'The optimization toolkit',
}

const bundleSizeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'bundle-size-and-code-splitting',
  text: 'Bundle size and code splitting',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whereTheTimeGoesHeader,
  benchmarksHeader,
  readingTheNumbersHeader,
  devModeHeader,
  toolkitHeader,
  bundleSizeHeader,
]

const benchmarkRows: ReadonlyArray<
  ReadonlyArray<ReadonlyArray<string | Html>>
> = [
  [['Svelte (optimised)'], ['148ms']],
  [['Elm (optimised)'], ['160ms']],
  [['Solid'], ['182ms']],
  [['Lustre 5 (optimised)'], ['206ms']],
  [['React 19 (optimised)'], ['275ms']],
  [['React 19 (unoptimised)'], ['397ms']],
  [['Foldkit (optimised)'], ['403ms']],
  [['Foldkit (naive)'], ['680ms']],
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('performance', 'Performance'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Performance questions about a framework usually mean three different things: how fast is the renderer, what does the architecture cost as an app grows, and how much JavaScript ships to the browser. This page answers all three, with numbers where numbers exist, and points at the tools Foldkit gives you when something is slow.',
      ),
      tableOfContentsEntryToHeader(whereTheTimeGoesHeader),
      para(
        'Every state change in a Foldkit app flows through one pipeline, so the cost model fits in a few sentences:',
      ),
      bullets(
        h.span(
          [],
          [
            'A dispatched Message runs ',
            inlineCode('update'),
            ', a pure function. The runtime compares the returned Model to the previous one by reference. If nothing changed, nothing renders.',
          ],
        ),
        'Renders coalesce. Any number of Messages arriving between frames mark the runtime dirty once; the next animation frame renders once with the latest Model. A burst of two hundred Messages costs two hundred update calls and a single render.',
        h.span(
          [],
          [
            'A render is ',
            inlineCode('view'),
            ' plus diff plus patch: build the new virtual tree, diff it against the previous one, and touch only the DOM that changed.',
          ],
        ),
        'User input is processed ahead of Command results when they share a frame, and long synchronous bursts yield back to the browser so the page keeps painting.',
      ),
      para(
        'The production hot path does no work proportional to Model size. No serialization, no deep comparison, no freezing, no snapshots. Change detection is reference equality, and ',
        inlineCode('evo'),
        ' preserves unchanged branches by reference, so the cost of a Message is the cost of your ',
        inlineCode('update'),
        ' logic, and the cost of a frame is the cost of the subtrees that actually changed.',
      ),
      tableOfContentsEntryToHeader(benchmarksHeader),
      para(
        'Foldkit ships a TodoMVC implementation for the ',
        link(Link.lustreBenchmark, 'lustre-labs/benchmark'),
        ' harness, which drives identical TodoMVC apps through one runbook (add 100 todos, toggle each one, destroy the first one 100 times) against identical markup, so absolute timings are comparable across frameworks. Foldkit registers two slots: a naive view that rebuilds the entire tree on every Message with no memoization, and an optimised view that adds ',
        inlineCode('createLazy'),
        ' on the header and footer and ',
        inlineCode('createKeyedLazy'),
        ' per todo item. The Model and update logic are identical in both. The implementation lives ',
        link(Link.foldkitLustreBenchmark, 'in the Foldkit repo'),
        ', so every number here is reproducible.',
      ),
      para(
        'Numbers below are from Foldkit 0.102.0, the release that shipped the runtime overhaul. Absolute times depend on hardware; the relative ordering is the point.',
      ),
      comparisonTable(['Implementation', 'Total time'], benchmarkRows),
      tableOfContentsEntryToHeader(readingTheNumbersHeader),
      para(
        'Two honest readings. First, Foldkit optimised currently lands at the same tier as unoptimised React 19. That is a respectable place to be and not the end goal.',
      ),
      para(
        'Second, Elm is the proof of what this architecture can do. Elm renders a pure view into a virtual DOM with lazy memoization, exactly Foldkit’s design, and runs within eight percent of Svelte’s compiled output. The distance between Foldkit and Elm is runtime implementation, not architecture, which is why the optimization work targets the runtime rather than replacing the rendering model. The trajectory matters too: one release before these numbers, the naive slot ran at 4,870ms. The overhaul brought it to 680ms by making views render synchronously, trimming the dispatch loop, and moving the attribute matcher to module scope.',
      ),
      tableOfContentsEntryToHeader(devModeHeader),
      para(
        'The dev server runs several systems that production builds strip entirely:',
      ),
      bullets(
        h.span(
          [],
          [
            link(coreFreezeModelRouter(), 'Freeze Model'),
            ' deep-freezes the Model after every update to catch accidental mutation at the write site.',
          ],
        ),
        h.span(
          [],
          [
            link(coreDevToolsRouter(), 'DevTools'),
            ' records each Message with Model snapshots and diffs for time travel.',
          ],
        ),
        h.span(
          [],
          [
            'The ',
            link(coreSlowViewRouter(), 'slow view warning'),
            ' times every view call against the frame budget.',
          ],
        ),
        'HMR Model preservation encodes the Model so state survives hot reloads.',
      ),
      para(
        'All of it is gated behind ',
        inlineCode('import.meta.hot'),
        ' and eliminated from production bundles. The consequence: judge performance with a production build. An animation-heavy app dispatching Messages at 60Hz pays the dev-mode systems on every single update, so the dev server systematically understates how the deployed app performs. If DevTools is enabled and Messages arrive at high frequency, pass ',
        inlineCode('excludeFromHistory'),
        ' so frame ticks and pointer moves skip history recording.',
      ),
      tableOfContentsEntryToHeader(toolkitHeader),
      para('When something is slow, work through this list in order:'),
      bullets(
        h.span(
          [],
          [
            'Let the ',
            link(coreSlowViewRouter(), 'slow view warning'),
            ' tell you whether the view is actually the problem before optimizing anything.',
          ],
        ),
        h.span(
          [],
          [
            'Memoize expensive subtrees with ',
            link(coreViewMemoizationRouter(), 'createLazy and createKeyedLazy'),
            '. This is the single highest-leverage tool, and it is what separates the two benchmark slots above.',
          ],
        ),
        h.span(
          [],
          [
            link(bestPracticesKeyingRouter(), 'Key'),
            ' branching views and mapped lists so the differ moves nodes instead of rebuilding them.',
          ],
        ),
        'Move computation out of the view and into update. The view runs on every render; update runs once per Message. Derived data that is expensive to compute belongs in the Model.',
        h.span(
          [],
          [
            'Render long lists with ',
            link(uiVirtualListRouter(), 'Virtual List'),
            ' so only visible items mount.',
          ],
        ),
      ),
      tableOfContentsEntryToHeader(bundleSizeHeader),
      para(
        'The package is ESM-only, marked side-effect-free, and exposed through subpath exports, so bundlers tree-shake everything an app does not import. A minimal counter app builds to 268 KB raw, 88 KB gzipped, and that includes the Foldkit runtime, Snabbdom, and Effect itself. Effect is the largest share of the baseline, and it is not dead weight: it is the same library your application code uses for Commands, Schemas, and data manipulation.',
      ),
      para('What splits today:'),
      bullets(
        h.span(
          [],
          [
            'Heavy dependencies behind dynamic ',
            inlineCode('import()'),
            '. This site loads the Monaco editor that way, only on the playground.',
          ],
        ),
        h.span(
          [],
          [
            'Independent apps on one page via ',
            link(coreEmbeddingRouter(), 'embedding'),
            ', each with its own bundle and lifecycle.',
          ],
        ),
      ),
      para(
        'What does not split today: the routes of a single app. A Foldkit program is one statically composed Model, update, and view, so the code for every page ships in the initial bundle. Route-level code splitting is a known gap under consideration, and the honest framing is that it requires design work against the single-Model architecture, not a configuration flag that has yet to be flipped.',
      ),
      para(
        'For first-paint and SEO concerns, see ',
        link(whatAboutSsrRouter(), 'What about SSR?'),
        ': every route of this site is pre-rendered to static HTML at build time.',
      ),
    ],
  )
}
