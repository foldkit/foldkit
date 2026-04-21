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

const runtimeEnforcementHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'runtime-enforcement',
  text: 'Runtime Enforcement in Development',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  immutableUpdatesHeader,
  runtimeEnforcementHeader,
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
        ' with stricter type checking — if you remove or rename a key from your Model, you’ll get type errors everywhere you try to update it.',
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
      tableOfContentsEntryToHeader(runtimeEnforcementHeader),
      para(
        'In development, Foldkit deep-freezes the Model after ',
        inlineCode('init'),
        ' and after every ',
        inlineCode('update'),
        '. An accidental mutation like ',
        inlineCode('model.items.push(...)'),
        ' throws a ',
        inlineCode('TypeError'),
        ' at the exact write site with a clear stack trace, instead of silently corrupting state or breaking reference-equality change detection.',
      ),
      para(
        'Freezing is scoped to plain objects and arrays. Effect-tagged values (',
        inlineCode('Option'),
        ', ',
        inlineCode('DateTime'),
        ', ',
        inlineCode('HashSet'),
        ', class instances) are left alone because they rely on lazy instance writes for hash memoization. Nested payloads inside an ',
        inlineCode('Option.some'),
        ' are still frozen.',
      ),
      para(
        'Production builds pay nothing for this feature. To enable freezing in every environment, or to disable it entirely, pass a ',
        inlineCode('freezeModel'),
        ' option to ',
        inlineCode('makeProgram'),
        '.',
      ),
    ],
  )
