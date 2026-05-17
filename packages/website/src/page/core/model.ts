import { Html, html } from 'foldkit/html'

import { Link } from '../../link'
import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
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

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/model', 'Model'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The Model represents your entire application state in a single, immutable data structure defined with ',
        link(Link.effectSchema, 'Effect Schema'),
        '. Everything your app can be at any moment lives here, not scattered across components, not split between local and global state.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', the Model is the waiter’s notebook: the running picture of everything happening right now. Orders in flight, tables seated, who’s waiting for dessert. Every fact about the current state of the restaurant lives in one place.',
      ),
      para(
        'In the counter example, the Model is a Struct with a single field:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.counterModelHighlighted)],
          [],
        ),
        Snippets.counterModelRaw,
        'Copy model example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'TypeScript types disappear when your code compiles. They help the compiler check your code, but they don’t exist at runtime. Schema keeps that type information alive as a value. This gives Foldkit knowledge of your Model at runtime: it can compare models for equality, decode state from unknown sources, and manage resource lifecycles, things that need the Model’s shape as a value, not just a compile-time annotation. You’ll see these capabilities pay off as the counter grows, especially on the Subscriptions page.',
      ),
      para(
        'The counter starts with a single field, but models grow with your app. When we add auto-counting later, the Model will expand:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.counterModelPreviewHighlighted),
          ],
          [],
        ),
        Snippets.counterModelPreviewRaw,
        'Copy expanded model example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'One state tree, not many',
        'Think of the Model as combining useState, useContext, and your Redux store into one typed structure. Instead of state scattered across components, everything lives here.',
      ),
      para(
        'The Model captures what your app is at any moment. But how does it change? In Foldkit, every change starts with a Message: a fact about something that happened.',
      ),
    ],
  )
}
