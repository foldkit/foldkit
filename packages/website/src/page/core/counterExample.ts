import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
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
      pageTitle('core/counter-example', 'A Simple Counter Example'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Here’s a complete counter application. It wires up the core of the loop from the ',
        link(coreArchitectureRouter(), 'Architecture'),
        ' page (a Model, Messages, update, init, and view).',
      ),
      para(
        'A Foldkit app lives in two files. ',
        inlineCode('src/main.ts'),
        ' holds the pure definitions: Model, Messages, update, init, view, etc. ',
        inlineCode('src/entry.ts'),
        ' imports them and boots the runtime. The split keeps ',
        inlineCode('main.ts'),
        ' importable from tests without booting a runtime as a side effect.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.counterHighlighted)],
          [],
        ),
        Snippets.counterRaw,
        'Copy counter main.ts to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('entry.ts'),
        ' is the only place runtime side effects happen. ',
        inlineCode('Runtime.makeProgram'),
        ' bundles the pieces together. ',
        inlineCode('Runtime.run'),
        ' starts the app.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.counterEntryHighlighted)],
          [],
        ),
        Snippets.counterEntryRaw,
        'Copy counter entry.ts to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Don’t worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we’ll add new features to the counter (a delayed reset, auto-counting, loading saved state) and each one will introduce a new concept.',
      ),
      para(
        'Let’s start with the Model: the single data structure that holds everything your application can be.',
      ),
    ],
  )
}
