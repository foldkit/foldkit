import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreViewMemoizationRouter } from '../../route'
import * as Snippets from '../../snippet'
import { highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/slow-view-warning', 'Slow View Warning'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Every time your model changes, Foldkit calls your ',
        inlineCode('view'),
        ' function to build a virtual DOM tree describing what the screen should look like. Foldkit then diffs that tree against the previous one and patches the real DOM. The ',
        inlineCode('view'),
        ' call is only the first step — the diff, DOM patch, browser layout, and paint still happen after it returns.',
      ),
      para(
        'During development, Foldkit measures how long the ',
        inlineCode('view'),
        ' call takes and warns in the console when it exceeds the frame budget. At 60fps the entire frame gets 16ms, so if ',
        inlineCode('view'),
        ' alone takes that long, you are already dropping frames before the DOM work even begins. The warning nudges you to move computation into ',
        inlineCode('update'),
        ' or memoize expensive subtrees with ',
        link(
          coreViewMemoizationRouter() + '#create-lazy',
          'createLazy',
        ),
        ' and ',
        link(
          coreViewMemoizationRouter() + '#create-keyed-lazy',
          'createKeyedLazy',
        ),
        '.',
      ),
      para(
        'The warning only runs in dev mode (gated behind ',
        inlineCode('import.meta.hot'),
        '), so there is zero runtime cost in production builds.',
      ),
      para(
        'The default threshold is 16ms (one frame at 60fps). Pass ',
        inlineCode('slowViewThresholdMs'),
        ' to ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ' to customize it:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.slowViewThresholdHighlighted),
          ],
          [],
        ),
        Snippets.slowViewThresholdRaw,
        'Custom slow view threshold',
        model,
        'mb-8',
      ),
      para(
        'Set ',
        inlineCode('slowViewThresholdMs'),
        ' to ',
        inlineCode('false'),
        ' to disable the warning entirely.',
      ),
    ],
  )
