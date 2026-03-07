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

const makeElementVsApplicationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'make-element-vs-application',
  text: 'makeElement vs makeApplication',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  makeElementVsApplicationHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/running-your-app', 'Running the App'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'To run a Foldkit application, create a runtime with ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ', then call ',
        inlineCode('Runtime.run'),
        '.',
      ),
      tableOfContentsEntryToHeader(makeElementVsApplicationHeader),
      para(
        inlineCode('makeElement'),
        ' creates a component without URL handling. The init function takes no URL argument (or just flags if you use them). Use this for standalone widgets or components embedded in existing pages.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.runMakeElementHighlighted),
          ],
          [],
        ),
        Snippets.runMakeElementRaw,
        'Copy makeElement example to clipboard',
        model,
        'mb-8',
      ),
      para(
        inlineCode('makeApplication'),
        ' creates a full-page application with routing. The init function receives the current URL, and you must provide a ',
        inlineCode('browser'),
        ' config to handle URL changes.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.runMakeApplicationHighlighted),
          ],
          [],
        ),
        Snippets.runMakeApplicationRaw,
        'Copy makeApplication example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('browser'),
        ' config has two handlers: ',
        inlineCode('onUrlRequest'),
        ' is called when a link is clicked (giving you a chance to handle internal vs external links), and ',
        inlineCode('onUrlChange'),
        ' is called when the URL changes (so you can update your model with the new route).',
      ),
    ],
  )
