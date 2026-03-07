import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { routingAndNavigationRouter } from '../../route'
import * as Snippets from '../../snippet'
import { highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const makeElementHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'make-element',
  text: 'makeElement',
}

const makeApplicationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'make-application',
  text: 'makeApplication',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  makeElementHeader,
  makeApplicationHeader,
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
      tableOfContentsEntryToHeader(makeElementHeader),
      para(
        inlineCode('makeElement'),
        ' creates a component without URL handling. The init function takes no arguments. If you configure a Flags schema, init receives the flags as its argument. Use this for standalone widgets or components embedded in existing pages.',
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
      tableOfContentsEntryToHeader(makeApplicationHeader),
      para(
        inlineCode('makeApplication'),
        ' creates a full-page application with routing. The init function receives the current URL (and flags, if configured). You must provide a ',
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
        ' is called when the URL changes (so you can update your model with the new route). See the ',
        link(routingAndNavigationRouter(), 'Routing & Navigation'),
        ' guide for a full walkthrough.',
      ),
      para(
        'Most apps can start with just these runtime options. The next page covers Resources — long-lived browser singletons like ',
        inlineCode('AudioContext'),
        ' or ',
        inlineCode('CanvasRenderingContext2D'),
        ' that are shared across Commands.',
      ),
    ],
  )
