import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreViewMemoizationRouter, exampleDetailRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

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

const playbookHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'playbook',
  text: 'Optimization playbook',
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
  playbookHeader,
  phasesHeader,
  configurationHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  const labeledBullet = (
    label: string,
    ...content: ReadonlyArray<string | Html>
  ): Html => h.span([], [h.strong([], [`${label}:`]), ' ', ...content])

  return h.div(
    [],
    [
      pageTitle('core/slow-warnings', 'Slow Warnings'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Every Message that flows through your app first runs ',
        inlineCode('update'),
        '. If that Message changes the Model, Foldkit then re-evaluates ',
        inlineCode('subscriptions'),
        ' dependency structs, calls ',
        inlineCode('view'),
        ' to rebuild the virtual DOM, and patches the real DOM. If any one of these synchronous phases blocks the main thread for too long, it causes dropped frames, stuck input, and visible jank.',
      ),
      para(
        'Foldkit measures all four phases in development by default. The ',
        inlineCode('slow'),
        ' runtime config lets you choose measured phases, override threshold budgets, and route warning contexts. When a phase exceeds its threshold, Foldkit fires a callback you control. The default is a ',
        inlineCode('console.warn'),
        ' with a remediation hint. Pass an ',
        inlineCode('onSlow'),
        ' callback to forward every slow-phase context to Sentry, an in-app diagnostics panel, or any other sink.',
      ),
      para(
        'Warnings run in dev mode by default (gated behind ',
        inlineCode('import.meta.hot'),
        '), so production builds pay nothing. Pass ',
        inlineCode("show: 'Always'"),
        ' to enable them in every environment.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'slow-warnings' }),
          'Slow Warnings example',
        ),
        ' intentionally trips each phase with the default thresholds, then records the actual callback payloads in the UI.',
      ),
      tableOfContentsEntryToHeader(whenToActHeader),
      infoCallout(
        'Treat warnings as signals, not problems to silence.',
        'A fired warning is a prompt to investigate, not a defect to clear. Confirm the cause with a profiler before changing code. A wasted ',
        link(`${coreViewMemoizationRouter()}#create-lazy`, 'createLazy'),
        ' with a low cache hit rate is slower than no ',
        inlineCode('createLazy'),
        '. Prefer correct, clear code first; performance fixes have a maintenance cost.',
      ),
      para(
        'Default thresholds are intentionally generous. Crossing them in dev mode is common and often fine in production: dev-server overhead, DevTools recording, a JS thread parked under a breakpoint, and slow CI workers all inflate measurements. Validate that the slowness is real by reproducing in a production build before optimizing.',
      ),
      para(
        'When you do optimize, measure before and after. Keep the change only if the profile shows a clear improvement. Otherwise, revert it and look elsewhere.',
      ),
      tableOfContentsEntryToHeader(playbookHeader),
      para(
        'The warning tag tells you where the main thread time was spent. It does not mean every phase needs a different architecture. Most fixes are about keeping render-only work in the render path, making that path skippable, and using update or Commands only when that matches the actual Model transition.',
      ),
      bullets(
        labeledBullet(
          'Render-only derived data',
          'If a value exists only to decide what to draw, compute it from ',
          inlineCode('view'),
          ' inputs and put the expensive subtree behind ',
          link(`${coreViewMemoizationRouter()}#create-lazy`, 'createLazy'),
          ' or ',
          inlineCode('createKeyedLazy'),
          '. Do not precompute it in ',
          inlineCode('update'),
          ' just to make a View warning disappear.',
        ),
        labeledBullet(
          'Slow View or Patch',
          'Start with stable keys for mapped lists and memoized boundaries around large regions. A lazy boundary helps only when its function and arguments often keep the same references between renders. If the inputs change every render, the cache misses every render.',
        ),
        labeledBullet(
          'Slow Update',
          'Start with the Message in the warning context. If that branch is calculating render-only data, move the calculation to the view path and memoize the affected subtree. If the branch is truly changing application state, make the expensive work run only for Messages that can change its inputs and reduce the amount of work in that transition.',
        ),
        labeledBullet(
          'Derived state in the Model',
          'Treat this as a last resort for synchronous state transitions, not the default rendering strategy. Use it only when profiling shows recomputation is the bottleneck, the derived value belongs with the Model, and update can maintain it incrementally from the same Messages that change its source data.',
        ),
        labeledBullet(
          'Commands',
          'A Command can reduce update cost because it runs after ',
          inlineCode('update'),
          ', but synchronous CPU work in a Command can still block the main thread. Use that shape when the work is an effect or a deliberately asynchronous computation.',
        ),
        labeledBullet(
          'Slow SubscriptionDependencies',
          inlineCode('modelToDependencies'),
          ' should be a cheap projection from already-modeled fields to the values a stream reads. Avoid scanning, sorting, serializing, or building large dependency objects there.',
        ),
      ),
      tableOfContentsEntryToHeader(phasesHeader),
      para(
        'Foldkit measures four phases independently. Each has its own default budget and attribution context:',
      ),
      bullets(
        labeledBullet(
          'view',
          'Building the next VNode tree from the Model. Default budget 16ms (one frame at 60fps). If the work is render-only, keep it in the view path and memoize the expensive subtree.',
        ),
        labeledBullet(
          'update',
          'The reducer call that produces the next Model. Default budget 4ms (a quarter-frame). Runs synchronously for every Message. Use the Message in the warning context to find the branch that spent the time.',
        ),
        labeledBullet(
          'patch',
          'Diffing the new VNode tree against the previous one and applying changes to the DOM. Default budget 8ms (half a frame). Stable keys and memoized subtrees let the diff skip work.',
        ),
        labeledBullet(
          'subscription dependencies',
          'Each subscription extracts a dependency struct from the Model on every Model change. Default budget 2ms per subscription. The callback receives a subscriptionKey for attribution.',
        ),
      ),
      tableOfContentsEntryToHeader(configurationHeader),
      para(
        'If you omit ',
        inlineCode('slow'),
        ', Foldkit enables all four phases in development with their default thresholds. Pass ',
        inlineCode('slow: false'),
        ' to disable every phase at once.',
      ),
      para(
        'If you pass a ',
        inlineCode('slow'),
        ' object, Foldkit still measures every phase by default. Use ',
        inlineCode('measuredPhases'),
        ' to choose which phases are measured at runtime and ',
        inlineCode('thresholdOverrides'),
        ' to replace default budgets for specific phases. Omitted threshold override fields keep Foldkit defaults, and overrides for phases outside ',
        inlineCode('measuredPhases'),
        ' are ignored. For example, ',
        inlineCode("measuredPhases: ['View', 'Patch']"),
        ' measures only view and patch. If you do not need to customize anything, omit ',
        inlineCode('slow'),
        ' entirely; that already keeps the default development warnings for all phases.',
      ),
      para(
        'Top-level ',
        inlineCode('show'),
        ' and ',
        inlineCode('onSlow'),
        ' apply to every measured phase. Passing ',
        inlineCode('onSlow'),
        " replaces Foldkit's default ",
        inlineCode('console.warn'),
        ' sink, so Foldkit will not also warn for tags your callback ignores. The callback receives a tagged ',
        inlineCode('SlowContext'),
        ' union even when ',
        inlineCode('measuredPhases'),
        ' selects a subset; discriminate on ',
        inlineCode('_tag'),
        ' (',
        inlineCode("'View' | 'Update' | 'Patch' | 'SubscriptionDependencies'"),
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
        'When a View or Patch warning genuinely points at expensive rendering, the first thing to try is memoization. The ',
        link(coreViewMemoizationRouter(), 'view memoization'),
        ' page covers ',
        inlineCode('createLazy'),
        ' and ',
        inlineCode('createKeyedLazy'),
        ', two tools for caching view subtrees so they skip both VNode construction and DOM diffing.',
      ),
    ],
  )
}
