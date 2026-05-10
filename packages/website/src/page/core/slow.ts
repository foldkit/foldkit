import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bulletPoint,
  bullets,
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
        ' nudging you toward the fix. Pass an ',
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
      tableOfContentsEntryToHeader(phasesHeader),
      para(
        'Foldkit measures four phases independently. Each has its own default budget:',
      ),
      bullets(
        bulletPoint(
          'view',
          'Building the next VNode tree from the Model. Default budget 16ms (one frame at 60fps). Slow when computation that should live in update or be memoized leaks into view. Fix by moving work into update or wrapping subtrees in createLazy / createKeyedLazy.',
        ),
        bulletPoint(
          'update',
          'The reducer call that produces the next Model. Default budget 4ms (a quarter-frame). Runs synchronously on the main thread for every Message. Slow when expensive computation lives in update instead of being deferred to a Command.',
        ),
        bulletPoint(
          'patch',
          'Diffing the new VNode tree against the previous one and applying changes to the DOM. Default budget 8ms (half a frame). Slow when lists are unkeyed (forcing positional matching), when a single render touches a huge subtree, or when too much of the tree is regenerated each frame. Fix by keying mapped lists and memoizing stable subtrees.',
        ),
        bulletPoint(
          'subscriptions',
          'Each subscription extracts a dependency struct from the Model on every Model change to decide whether to re-subscribe. Default budget 2ms per subscription. Slow when modelToDependencies does heavy work or returns a wide struct that is expensive to compare for equality. Fix by narrowing the struct or supplying a custom equivalence.',
        ),
      ),
      para(
        'Subscriptions are measured per subscription. The callback receives a ',
        inlineCode('subscriptionKey'),
        ' so you can attribute the warning to a specific entry in your subscriptions record.',
      ),
      tableOfContentsEntryToHeader(configurationHeader),
      para(
        'Each phase opts in independently. Set a phase to ',
        inlineCode('{}'),
        ' for defaults, ',
        inlineCode('{ thresholdMs?, onSlow? }'),
        ' to override, or ',
        inlineCode('false'),
        ' to disable. A phase left ',
        inlineCode('undefined'),
        ' is also disabled, so writing ',
        inlineCode('slow: { view: {} }'),
        ' produces only view warnings.',
      ),
      para(
        'Top-level ',
        inlineCode('show'),
        ' and ',
        inlineCode('onSlow'),
        ' apply to every enabled phase. The top-level ',
        inlineCode('onSlow'),
        ' receives a tagged ',
        inlineCode('SlowContext'),
        ' union, which is the natural shape for forwarding all phases to a single sink:',
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
        'Per-phase ',
        inlineCode('onSlow'),
        ' overrides the top-level callback for that phase. The phase-specific contexts (',
        inlineCode('SlowViewContext'),
        ', ',
        inlineCode('SlowUpdateContext'),
        ', ',
        inlineCode('SlowPatchContext'),
        ', ',
        inlineCode('SlowSubscriptionsContext'),
        ') are exported individually if you want to type a per-phase callback narrowly.',
      ),
      para(
        'When a warning fires, the most effective fix is usually memoization. The ',
        link(coreViewMemoizationRouter(), 'view memoization'),
        ' page covers ',
        inlineCode('createLazy'),
        ' and ',
        inlineCode('createKeyedLazy'),
        ', two tools for caching view subtrees so they skip both VNode construction and DOM diffing.',
      ),
    ],
  )
