import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreArchitectureRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/counter-example', 'A Simple Counter Example'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Here\u2019s a complete counter application. It has all the pieces from the ',
        link(coreArchitectureRouter(), 'Architecture'),
        ' page (a Model, Messages, update, init, and view) wired together and running.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.counterHighlighted)], []),
        Snippets.counterRaw,
        'Copy counter example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Don\u2019t worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we\u2019ll add new features to the counter (a delayed reset, auto-counting, loading saved state) and each one will introduce a new concept.',
      ),
      para(
        'Let\u2019s start with the Model: the single data structure that holds everything your application can be.',
      ),
    ],
  )
