import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
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
      pageTitle('core/model', 'Model'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The Model represents your entire application state in a single, immutable data structure defined with ',
        link(Link.effectSchema, 'Effect Schema'),
        '. Everything your app can be at any moment lives here — not scattered across components, not split between local and global state.',
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
      para(
        'Why use Schema instead of a plain TypeScript type? Schema gives you a callable constructor that validates at the boundary — when data enters your app from localStorage, a ',
        inlineCode('WebSocket'),
        ', or a URL, Schema ensures it matches the shape you declared. As your app grows, this prevents impossible states from sneaking into your model.',
      ),
      para(
        'The counter starts with a simple number, but models grow with your app. When we add auto-counting later, the model will expand:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterModelPreviewHighlighted),
          ],
          [],
        ),
        Snippets.counterModelPreviewRaw,
        'Copy expanded model example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'One state tree, not many',
        'Think of the Model as combining useState, useContext, and your Redux store into one typed structure. Instead of state scattered across components, everything lives here.',
      ),
      para(
        'The model captures what your app is at any moment. But how does it change? In Foldkit, every change starts with a Message — a fact about something that happened.',
      ),
    ],
  )
