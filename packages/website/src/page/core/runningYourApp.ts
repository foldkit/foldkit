import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { routingAndNavigationRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const makeProgramHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'make-program',
  text: 'makeProgram',
}

const withoutRoutingHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'without-routing',
  text: 'Without routing',
}

const withRoutingHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'with-routing',
  text: 'With routing',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  makeProgramHeader,
  withoutRoutingHeader,
  withRoutingHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/running-your-app', 'Running the App'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'To run a Foldkit application, create a runtime with ',
        inlineCode('makeProgram'),
        ', then call ',
        inlineCode('Runtime.run'),
        '.',
      ),
      tableOfContentsEntryToHeader(makeProgramHeader),
      para(
        inlineCode('makeProgram'),
        ' creates a Foldkit runtime. It handles both standalone components and full applications with routing. The difference is whether you provide a ',
        inlineCode('routing'),
        ' config.',
      ),
      tableOfContentsEntryToHeader(withoutRoutingHeader),
      para(
        'Without a ',
        inlineCode('routing'),
        " config, the program doesn't manage the URL bar. This is the default for most programs.",
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.runMakeElementHighlighted)],
          [],
        ),
        Snippets.runMakeElementRaw,
        'Copy makeProgram without routing example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(withRoutingHeader),
      para(
        'With a ',
        inlineCode('routing'),
        ' config, the program manages the URL bar. The init function receives the current URL so it can set the initial route.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.runMakeApplicationHighlighted)],
          [],
        ),
        Snippets.runMakeApplicationRaw,
        'Copy makeProgram with routing example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('routing'),
        ' config has two handlers: ',
        inlineCode('onUrlRequest'),
        ' is called when a link is clicked (giving you a chance to handle internal vs external links), and ',
        inlineCode('onUrlChange'),
        ' is called when the URL changes (so you can update your model with the new route). See the ',
        link(routingAndNavigationRouter(), 'Routing & Navigation'),
        ' guide for a full walkthrough.',
      ),
      para(
        'The optional ',
        inlineCode('title'),
        ' function sets ',
        inlineCode('document.title'),
        ' after every render. It receives the current Model, so the browser tab title stays in sync as you navigate.',
      ),
      para(
        'Most apps can start with just these runtime options. The next page covers Resources: long-lived browser singletons like ',
        inlineCode('AudioContext'),
        ' or ',
        inlineCode('CanvasRenderingContext2D'),
        ' that are shared across Commands.',
      ),
    ],
  )
