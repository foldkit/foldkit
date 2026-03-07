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
        'During development, Foldkit warns in the console when a ',
        inlineCode('view'),
        ' call takes longer than the frame budget. A view that exceeds 16ms is already dropping frames. The warning nudges you to move computation into ',
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
