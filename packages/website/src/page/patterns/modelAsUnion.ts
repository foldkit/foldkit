import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
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
      pageTitle('patterns/model-as-union', 'Model as Union'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'When your app has mutually exclusive states—like logged in vs logged out, wizard steps, or game phases—you can model your root state as a union of variants rather than embedding submodels in a struct.',
      ),
      para(
        'Define each variant as a tagged struct, then combine them with ',
        inlineCode('S.Union'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionRootHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionRootRaw,
        'Copy model to clipboard',
        model,
        'mb-8',
      ),
      para(
        'In the view, use ',
        inlineCode('Match.tagsExhaustive'),
        ' to handle each variant:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionViewHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionViewRaw,
        'Copy view to clipboard',
        model,
        'mb-8',
      ),
      para(
        'To transition between states, return a different variant from update:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionTransitionHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionTransitionRaw,
        'Copy transition to clipboard',
        model,
        'mb-8',
      ),
      para(
        'See the ',
        link(Link.exampleAuth, 'Auth example'),
        ' for a complete implementation.',
      ),
      para(
        'If you need shared state across union variants, wrap the union in a struct:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionSharedStateHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionSharedStateRaw,
        'Copy shared state model to clipboard',
        model,
        'mb-8',
      ),
    ],
  )
