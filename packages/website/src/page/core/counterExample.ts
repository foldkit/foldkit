import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
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
        "Here's a complete counter application. It has all the pieces from the architecture page \u2014 a Model, Messages, update, init, and view \u2014 wired together and running.",
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
        "Don't worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we'll add new features to the counter \u2014 a delayed reset, auto-counting, loading saved state \u2014 and each one will introduce a new concept.",
      ),
      para(
        "Let's start with the Model \u2014 the single data structure that holds everything your application can be.",
      ),
    ],
  )
