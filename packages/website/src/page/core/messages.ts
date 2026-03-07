import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, em } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
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
      pageTitle('core/messages', 'Messages'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Messages represent all the events that can occur in your application. They describe ',
        em([], ['what happened']),
        ', not ',
        em([], ['how to handle it']),
        '. Messages are implemented as tagged unions, providing exhaustive pattern matching and type safety.',
      ),
      para('The counter example has three simple messages:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterMessagesHighlighted),
          ],
          [],
        ),
        Snippets.counterMessagesRaw,
        'Copy messages example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'Actions without the boilerplate',
        'Messages are similar to Redux action types, but more ergonomic with Effect Schema. Instead of string constants and action creators, you get type inference and pattern matching for free.',
      ),
    ],
  )
