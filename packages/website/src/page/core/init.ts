import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const flagsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'flags',
  text: 'Flags',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  flagsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/init', 'Init & Flags'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The counter works, but every time the user refreshes the page, the count resets to zero. What if we want to remember the last count? That\u2019s where Init comes in \u2014 and where flags let you pass data into your app at startup.',
      ),
      para(
        'In the restaurant analogy, init is the waiter\u2019s notebook at the start of the shift \u2014 the state of every table before the first customer walks in.',
      ),
      para(
        'The ',
        inlineCode('init'),
        ' function returns the initial Model and any Commands to run on startup. It returns a tuple of ',
        inlineCode('[Model, ReadonlyArray<Command<Message>>]'),
        '.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.initSimpleHighlighted)], []),
        Snippets.initSimpleRaw,
        'Copy init example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'For elements (components without routing), init takes no arguments. For applications with routing, init receives the current URL so you can set up initial state based on the route.',
      ),
      tableOfContentsEntryToHeader(flagsHeader),
      para(
        'In the restaurant analogy, flags are what the manager tells the waiter before the shift: \u201Ctable 5 has a reservation at 7, and we\u2019re out of the salmon.\u201D Information from outside the app that shapes the initial state.',
      ),
      para(
        'Flags let you pass initialization data into your application \u2014 things like persisted state from localStorage or configuration values. Define a Flags schema and provide an Effect that loads the flags.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.flagsDefinitionHighlighted)],
          [],
        ),
        Snippets.flagsDefinitionRaw,
        'Copy flags definition to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When using flags, your init function receives them as the first argument:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.initWithFlagsHighlighted)],
          [],
        ),
        Snippets.initWithFlagsRaw,
        'Copy init with flags to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'You\u2019ve now seen the full Foldkit architecture: the Model holds your state, Messages describe events, update transitions state, the view renders it, Commands handle one-off side effects, Subscriptions manage ongoing streams, and init bootstraps everything. The remaining pages cover utilities, runtime configuration, and advanced topics you\u2019ll reach for as your app grows.',
      ),
    ],
  )
