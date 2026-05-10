import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bulletPoint,
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreViewMemoizationRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const h = html<Message>()

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whenToActHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-to-act',
  text: 'When to act on a warning',
}

const phasesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'phases',
  text: 'Measured phases',
}

const configurationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'configuration',
  text: 'Configuration',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whenToActHeader,
  phasesHeader,
  configurationHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  h.div(
    [],
    [
      pageTitle('core/slow', 'Slow Warnings'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Every Message that flows through your app drives a synchronous chain: ',
        inlineCode('update'),
        ' produces the next Model, ',
        inlineCode('subscriptions'),
        ' re-evaluates its dependency struct, ',
        inlineCode('view'),
        ' rebuilds the virtual DOM, and Foldkit patches the real DOM. Any one of these phases blocking the main thread for too long causes dropped frames, stuck input, and visible jank.',
      ),
      para(
        'The ',
        inlineCode('slow'),
        ' runtime config attaches a per-phase timer. When a phase exceeds its threshold, Foldkit fires a callback you control. The default is a ',
        inlineCode('console.warn'),
        ' with a remediation hint. Pass an ',
        inlineCode('onSlow'),
        ' callback to forward to Sentry, an in-app HUD, or any other sink.',
      ),
      para(
        'Warnings run in dev mode by default (gated behind ',
        inlineCode('import.meta.hot'),
        '), so production builds pay nothing. Pass ',
        inlineCode("show: 'Always'"),
        ' to enable them in every environment.',
      ),
      tableOfContentsEntryToHeader(whenToActHeader),
      infoCallout(
        'Treat warnings as signals, not problems to silence.',
        'A fired warning is a prompt to investigate, not a defect to clear. Confirm the cause with a profiler before changing code. A wasted ',
        inlineCode('createLazy'),
        ' with a low cache hit rate is slower than no ',
        inlineCode('createLazy'),
        '. Prefer correct, clear code first; performance fixes have a maintenance cost.',
      ),
      para(
        'Default thresholds are intentionally generous. Crossing them in dev mode is common and often fine in production: HMR overhead, DevTools recording, a JS thread parked under a breakpoint, and slow CI workers all inflate measurements. Validate that the slowness is real by reproducing in a production build before optimizing.',
      ),
      para(
        "When you do optimize, measure before and after. If you can't show a clear improvement in a profile, revert the change and look elsewhere. Optimizations should be load-bearing.",
      ),
      tableOfContentsEntryToHeader(phasesHeader),
      para(
        'Foldkit measures four phases independently. Each has its own default budget and its own playbook:',
      ),
      bullets(
        bulletPoint(
          'view',
          'Building the next VNode tree from the Model. Default budget 16ms (one frame at 60fps). Common fix: memoize expensive subtrees with createLazy or createKeyedLazy. Avoid storing derived data on the Model as a cache; the Model should hold state, not computed views.',
        ),
        bulletPoint(
          'update',
          "The reducer call that produces the next Model. Default budget 4ms (a quarter-frame). Runs synchronously for every Message. Common fixes: memoize the computation by its inputs, narrow what runs per Message, or split the Model so unrelated changes don't trigger the expensive path. Deferring work to a Command helps only when the result isn't needed for the immediate next Model; otherwise Commands won't address the slowness.",
        ),
        bulletPoint(
          'patch',
          'Diffing the new VNode tree against the previous one and applying changes to the DOM. Default budget 8ms (half a frame). Common fixes: key mapped lists by a stable id (positional matching scales poorly), split a large view into smaller memoized regions, and use createLazy on stable subtrees so the diff skips them entirely.',
        ),
        bulletPoint(
          'subscriptions',
          'Each subscription extracts a dependency struct from the Model on every Model change. Default budget 2ms per subscription. The callback receives a subscriptionKey for attribution. Common fixes: narrow the dependency struct to the fields the stream actually reads, supply a custom equivalence for cheap comparison, or move derived data into the Model so modelToDependencies is a simple lookup.',
        ),
      ),
      tableOfContentsEntryToHeader(configurationHeader),
      para(
        'Each phase opts in independently. Set a phase to ',
        inlineCode('{}'),
        ' for defaults, ',
        inlineCode('{ thresholdMs }'),
        ' to override, or ',
        inlineCode('false'),
        ' to disable. A phase left ',
        inlineCode('undefined'),
        ' is also disabled, so writing ',
        inlineCode('slow: { view: {} }'),
        ' produces only view warnings. Pass ',
        inlineCode('slow: false'),
        ' to disable every phase at once.',
      ),
      para(
        'Top-level ',
        inlineCode('show'),
        ' and ',
        inlineCode('onSlow'),
        ' apply to every enabled phase. The callback receives a tagged ',
        inlineCode('SlowContext'),
        ' union; discriminate on ',
        inlineCode('_tag'),
        ' (',
        inlineCode("'View' | 'Update' | 'Patch' | 'Subscriptions'"),
        ') to route per phase or forward all four to a single sink:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.slowConfigHighlighted)],
          [],
        ),
        Snippets.slowConfigRaw,
        'Configuring slow-phase warnings',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When a warning genuinely points at expensive rendering, the first thing to try is memoization. The ',
        link(coreViewMemoizationRouter(), 'view memoization'),
        ' page covers ',
        inlineCode('createLazy'),
        ' and ',
        inlineCode('createKeyedLazy'),
        ', two tools for caching view subtrees so they skip both VNode construction and DOM diffing.',
      ),
    ],
  )
