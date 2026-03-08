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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/task', 'Task'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit provides utility functions for common side effects that return commands you can use in your update function.',
      ),
      para(
        inlineCode('Task.getTime'),
        ' gets the current UTC time. ',
        inlineCode('Task.getZonedTime'),
        ' gets time with the system timezone. ',
        inlineCode('Task.getZonedTimeIn'),
        ' gets time in a specific timezone.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.taskGetTimeHighlighted)], []),
        Snippets.taskGetTimeRaw,
        'Copy task time examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('Task.focus'),
        ' focuses an element by CSS selector (useful after form submission). ',
        inlineCode('Task.randomInt'),
        ' generates random integers.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.taskFocusHighlighted)], []),
        Snippets.taskFocusRaw,
        'Copy task focus example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Now that you know how to write commands and use built-in tasks, the next step is wiring everything together into a running application.',
      ),
    ],
  )
