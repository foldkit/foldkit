import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
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
      pageTitle('core/model', 'Model'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The Model represents your entire application state in a single, immutable data structure. In Foldkit, the Model is defined using ',
        link(Link.effectSchema, 'Effect Schema'),
        ', which provides runtime validation, type inference, and a single source of truth for your application state.',
      ),
      para('In the counter example, the model is simply a number.'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterModelHighlighted),
          ],
          [],
        ),
        Snippets.counterModelRaw,
        'Copy model example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'One state tree, not many',
        'Think of the Model as combining useState, useContext, and your Redux store into one typed structure. Instead of state scattered across components, everything lives here.',
      ),
    ],
  )
