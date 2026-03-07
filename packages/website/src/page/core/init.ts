import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  inlineCode,
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

const flagsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'flags',
  text: 'Flags',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  flagsHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/init', 'Init'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('init'),
        ' function returns the initial model and any commands to run on startup. It returns a tuple of ',
        inlineCode('[Model, ReadonlyArray<Command<Message>>]'),
        '.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.initSimpleHighlighted),
          ],
          [],
        ),
        Snippets.initSimpleRaw,
        'Copy init example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'For elements (components without routing), init takes no arguments. For applications with routing, init receives the current URL so you can set up initial state based on the route.',
      ),
      tableOfContentsEntryToHeader(flagsHeader),
      para(
        'Flags let you pass initialization data into your application — things like persisted state from localStorage or configuration values. Define a Flags schema and provide an Effect that loads the flags.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.flagsDefinitionHighlighted),
          ],
          [],
        ),
        Snippets.flagsDefinitionRaw,
        'Copy flags definition to clipboard',
        model,
        'mb-8',
      ),
      para(
        'When using flags, your init function receives them as the first argument:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.initWithFlagsHighlighted),
          ],
          [],
        ),
        Snippets.initWithFlagsRaw,
        'Copy init with flags to clipboard',
        model,
        'mb-8',
      ),
    ],
  )
