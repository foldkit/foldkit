import { Html } from 'foldkit/html'

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

const immutableUpdatesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'immutable-updates',
  text: 'Immutable Updates with evo',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  immutableUpdatesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('best-practices/immutability', 'Immutability'),
      tableOfContentsEntryToHeader(immutableUpdatesHeader),
      para(
        'Foldkit provides ',
        inlineCode('evo'),
        " for immutable model updates. It wraps Effect's ",
        inlineCode('Struct.evolve'),
        ' with stricter type checking. If you remove or rename a key from your Model, you’ll get type errors everywhere you try to update it.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.evoExampleHighlighted)], []),
        Snippets.evoExampleRaw,
        'Copy evo example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Each property in the transform object is a function that takes the current value and returns the new value. Properties not included remain unchanged.',
      ),
    ],
  )
