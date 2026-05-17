import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
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

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/runtime', 'Runtime'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Foldkit app lives in two files. ',
        inlineCode('src/main.ts'),
        ' holds the pure definitions: Model, Messages, update, init, and view. ',
        inlineCode('src/entry.ts'),
        ' imports them, creates a runtime with ',
        inlineCode('makeProgram'),
        ', and calls ',
        inlineCode('Runtime.run'),
        '. ',
        inlineCode('entry.ts'),
        ' is the only place runtime side effects happen, which keeps ',
        inlineCode('main.ts'),
        ' importable from tests.',
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
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.runMakeElementHighlighted)],
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.runMakeApplicationHighlighted),
          ],
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
        'Your ',
        inlineCode('view'),
        ' function returns a ',
        inlineCode('Document'),
        ': an object with ',
        inlineCode('title'),
        ', ',
        inlineCode('body'),
        ', and optional ',
        inlineCode('canonical'),
        ' / ',
        inlineCode('ogUrl'),
        ' fields. The runtime sets ',
        inlineCode('document.title'),
        ' from your ',
        inlineCode('title'),
        ' on every render, and syncs the canonical and og:url meta tags so platform share menus copy the right link as you navigate. Both meta fields default to the current URL when omitted.',
      ),
    ],
  )
}
