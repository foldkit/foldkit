import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreSubmodelRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const initHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'init',
  text: 'Init',
}

const flagsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'flags',
  text: 'Flags',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  initHeader,
  flagsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/init', 'Init & Flags'),
      tableOfContentsEntryToHeader(initHeader),
      para(
        'The counter works, but every time the user refreshes the page, the count resets to zero. What if we want to remember the last count? That’s where Init comes in, and where flags let you pass data into your app at startup.',
      ),
      para(
        'In the restaurant analogy, init is the waiter’s notebook at the start of the shift: the state of every table before the first customer walks in.',
      ),
      para(
        'The ',
        inlineCode('init'),
        ' function returns the initial Model and any Commands to run on startup. It returns a tuple of ',
        inlineCode('[Model, ReadonlyArray<Command<Message>>]'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.initSimpleHighlighted)],
          [],
        ),
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
        'In the restaurant analogy, flags are what the manager tells the waiter before the shift: “table 5 has a reservation at 7, and we’re out of the salmon.” Information from outside the app that shapes the initial state.',
      ),
      para(
        'Flags let you pass initialization data into your application, like persisted state from localStorage or configuration values. Define a Flags schema and provide an Effect that loads the flags.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.flagsDefinitionHighlighted),
          ],
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
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.initWithFlagsHighlighted)],
          [],
        ),
        Snippets.initWithFlagsRaw,
        'Copy init with flags to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Once your app outgrows a single Model, Message, and update, the next step is to decompose it into ',
        link(coreSubmodelRouter(), 'Submodels'),
        ': self-contained modules with their own state, Messages, and update, embedded under a parent.',
      ),
    ],
  )
}
