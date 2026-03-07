import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
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
      pageTitle('core/update', 'Update'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        "The update function is the heart of your application logic. It's a pure function that takes the current model and a message, and returns a new model along with any commands to execute. Commands represent side effects and are covered later on this page.",
      ),
      para(
        'Foldkit uses ',
        link(Link.effectMatch, 'Effect.Match'),
        ' for exhaustive pattern matching on messages. The TypeScript compiler will error if you forget to handle a message type.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterUpdateHighlighted),
          ],
          [],
        ),
        Snippets.counterUpdateRaw,
        'Copy update example to clipboard',
        model,
        'mb-8',
      ),
    ],
  )
