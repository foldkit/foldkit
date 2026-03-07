import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, strong } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
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
      pageTitle('core/counter-example', 'A Simple Counter Example'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Every Foldkit app is built from the same four pieces: a ',
        strong([], ['Model']),
        ' (application state), ',
        strong([], ['Messages']),
        ' (events that can happen), an ',
        strong([], ['Update']),
        ' function (state transitions), and a ',
        strong([], ['View']),
        ' (rendering).',
      ),
      para(
        "Here's a complete counter application that puts all four together.",
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterHighlighted)],
          [],
        ),
        Snippets.counterRaw,
        'Copy counter example to clipboard',
        model,
        'mb-8',
      ),
      para(
        "Don't worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we'll add new features to the counter — a delayed reset, auto-counting, loading saved state — and each one will introduce a new concept.",
      ),
      para(
        "Let's start with the Model — the single data structure that holds everything your application can be.",
      ),
    ],
  )
