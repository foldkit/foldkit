import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreArchitectureRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const h = html<Message>()

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  h.div(
    [],
    [
      pageTitle('core/counter-example', 'A Simple Counter Example'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Here’s a complete counter application. It has all the pieces from the ',
        link(coreArchitectureRouter(), 'Architecture'),
        ' page (a Model, Messages, update, init, and view) wired together and running.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.counterHighlighted)],
          [],
        ),
        Snippets.counterRaw,
        'Copy counter example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Don’t worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we’ll add new features to the counter (a delayed reset, auto-counting, loading saved state) and each one will introduce a new concept.',
      ),
      para(
        'Let’s start with the Model: the single data structure that holds everything your application can be.',
      ),
    ],
  )
