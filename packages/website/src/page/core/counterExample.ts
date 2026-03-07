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
        'The easiest way to learn how Foldkit works is to first look at examples, then dive deeper to understand each piece in isolation.',
      ),
      para(
        "Here's a simple counter application that demonstrates Foldkit's core concepts: the ",
        strong([], ['Model']),
        ' (application state), ',
        strong([], ['Messages']),
        ' (model updates), ',
        strong([], ['Update']),
        ' (state transitions), and ',
        strong([], ['View']),
        ' (rendering). Take a look at the counter example below in full, then continue to see a more detailed explanation of each piece.',
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
    ],
  )
