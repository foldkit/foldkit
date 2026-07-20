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
  coreSlowWarningsRouter,
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
  [['Svelte (optimised)'], ['59.2ms'], ['1.00×']],
  [['Gren (optimised)'], ['70.6ms'], ['1.19×']],
  [['Elm (optimised)'], ['72.7ms'], ['1.23×']],
  [['Svelte (unoptimised)'], ['79.1ms'], ['1.34×']],
  [['Solid (unoptimised)'], ['86.7ms'], ['1.46×']],
  [['Lustre 5 (optimised)'], ['97.1ms'], ['1.64×']],
  [['Foldkit (optimised)'], ['119.3ms'], ['2.02×']],
  [['Vue (unoptimised)'], ['134.2ms'], ['2.27×']],
  [['React 19 (optimised)'], ['136.1ms'], ['2.30×']],
  [['Gren (unoptimised)'], ['159.3ms'], ['2.69×']],
  [['Elm (unoptimised)'], ['161.4ms'], ['2.73×']],
  [['Lustre 5 (unoptimised)'], ['169.0ms'], ['2.85×']],
  [['React 19 (unoptimised)'], ['198.9ms'], ['3.36×']],
  [['Alpine (unoptimised)'], ['258.1ms'], ['4.36×']],
  [['Foldkit (unoptimised)'], ['352.9ms'], ['5.96×']],
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
            ' synchronously, right on the dispatching stack, in arrival order. The runtime compares the returned Model to the previous one by reference. If nothing changed, nothing renders.',
          ],
        ),
        'Renders coalesce. Any number of Messages arriving between frames mark at most one pending frame; the next animation frame renders once with the latest Model. A burst of two hundred Messages inside one frame costs two hundred update calls and a single render.',
        h.span(
          [],
          [
            'A render is ',
            inlineCode('view'),
            ' plus diff plus patch: build the new virtual tree, diff it against the previous one, and touch only the DOM that changed.',
          ],
        ),
        'Command results always arrive asynchronously, and a synchronous burst that holds the stack past a small budget defers its remaining Messages to a new task so the page keeps painting.',
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
        ' harness, which drives each implementation through the same TodoMVC workload and required selectors (add 100 todos, toggle each one, destroy the first one 100 times). Same-batch timings are comparable because every implementation uses the same driver, runbook, and browser batch. Foldkit registers two slots: an unoptimised view that rebuilds the entire tree on every Message with no memoization, and an optimised view that adds ',
        inlineCode('createLazy'),
        ' slots for the header, the footer, the filters list, and the toggle-all controls, and ',
        inlineCode('createKeyedLazy'),
        ' per todo item. The Model and update logic are identical in both. The implementation lives ',
        link(Link.foldkitLustreBenchmark, 'in the Foldkit repo'),
        ', so you can run the comparison yourself.',
      ),
      para(
        'These cover every current-version framework variant in the harness plus Foldkit’s two current development slots; the legacy Lustre 4 and older Foldkit slots are excluded. The medians come from fifteen interleaved runs in one position-balanced batch, so every implementation occupied every ordinal run position once. The batch used harness commit 03fff17 and Chromium 149.0.7827.55. The relative column divides each displayed median by the fastest median from that same batch. Absolute times depend on hardware and browser conditions; the same-run relationships are the result to compare.',
      ),
      comparisonTable(
        ['Implementation', 'Median time', 'Relative to fastest'],
        benchmarkRows,
      ),
      tableOfContentsEntryToHeader(readingTheNumbersHeader),
      para(
        'Foldkit optimised ranks seventh of fifteen in this batch. It takes 2.02 times the fastest row, about 1.23 times optimised Lustre’s time, and 1.38 times Solid’s. Vue takes about 1.12 times Foldkit’s time, while optimised React takes about 1.14 times Foldkit’s. Per-bucket attribution puts the remaining distance in view and patch work inside animation frames rather than Message dispatch.',
      ),
      para(
        'Elm is the proof of what this architecture can do. Elm renders a pure view into a virtual DOM with lazy memoization, exactly Foldkit’s design, and sits near the batch leaders at 1.23 times the fastest row. Foldkit takes 1.64 times Elm’s time. That distance is runtime implementation, not architecture, which is why optimization work targets the runtime and owned differ rather than replacing the rendering model.',
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
            link(coreSlowWarningsRouter(), 'Slow Warnings'),
            ' can time update, subscriptions, view, and patch work against phase budgets.',
          ],
        ),
        'HMR Model preservation encodes the Model so state survives hot reloads.',
      ),
      para(
        'All of it is gated behind ',
        inlineCode('import.meta.hot'),
        ' and eliminated from production bundles. The consequence: judge performance with a production build. An animation-heavy app dispatching Messages at 60Hz pays the dev-mode systems on every single update, so the dev server systematically understates how the deployed app performs. If DevTools is enabled, use ',
        inlineCode('excludeFromHistory'),
        ' to skip history recording for high-frequency Messages like frame ticks and pointer moves.',
      ),
      tableOfContentsEntryToHeader(toolkitHeader),
      para('When something is slow, work through this list in order:'),
      bullets(
        h.span(
          [],
          [
            'Let the ',
            link(coreSlowWarningsRouter(), 'Slow Warnings'),
            ' tell you which synchronous phase is actually slow before optimizing anything.',
          ],
        ),
        h.span(
          [],
          [
            'Memoize expensive subtrees with ',
            link(coreViewMemoizationRouter(), 'createLazy and createKeyedLazy'),
            '. This is the single highest-leverage tool, and it is what separates the Foldkit (unoptimised) row from the Foldkit (optimised) row in the benchmark table above.',
          ],
        ),
        h.span(
          [],
          [
            link(bestPracticesKeyingRouter(), 'Key'),
            ' mapped list items by stable Model ids, the one identity only your data can provide, so the differ moves nodes instead of rebuilding them. Branching views need no keys: view functions carry identity, and the differ replaces DOM when a position’s identity changes.',
          ],
        ),
        h.span(
          [],
          [
            'Cache expensive derived data on the Model when memoization cannot cover it. The view recomputes a derived value on every render whether or not its inputs changed; update can compute it once, in the branches that change those inputs. The price is a derived field every such branch must keep in sync, so reach for this after ',
            inlineCode('createLazy'),
            ', not before.',
          ],
        ),
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
        'The package is ESM-only, marked side-effect-free, and exposed through subpath exports, so bundlers tree-shake everything an app does not import. A minimal counter app builds to about 270 KB raw and just under 90 KB gzipped, and that includes the Foldkit runtime, its vendored differ, and Effect itself. Effect is the largest share of the baseline, and it is not dead weight: it is the same library your application code uses for Commands, Schemas, and data manipulation.',
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
        'What does not split today: the routes of a single app. A Foldkit program is one statically composed Model, update, and view, so the code for every page ships in the initial bundle. Elm shares this property for the same reason. Splitting a program by route would take design work against the single-Model architecture, not a configuration flag.',
      ),
      para(
        'See ',
        link(whatAboutSsrRouter(), 'What about SSR?'),
        ' for first-paint and SEO concerns.',
      ),
    ],
  )
}
