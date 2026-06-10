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

const makeApplicationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'make-application',
  text: 'makeApplication',
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

const makeElementHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'make-element',
  text: 'makeElement',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  makeApplicationHeader,
  withoutRoutingHeader,
  withRoutingHeader,
  makeElementHeader,
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
        inlineCode('makeApplication'),
        ', and calls ',
        inlineCode('Runtime.run'),
        '. ',
        inlineCode('entry.ts'),
        ' is the only place runtime side effects happen, which keeps ',
        inlineCode('main.ts'),
        ' importable from tests.',
      ),
      tableOfContentsEntryToHeader(makeApplicationHeader),
      para(
        inlineCode('makeApplication'),
        ' creates a Foldkit runtime for an app that owns the page. It handles both single-page apps and full applications with routing. The difference is whether you provide a ',
        inlineCode('routing'),
        ' config. To mount an app scoped to a node without owning the page, use ',
        inlineCode('makeElement'),
        ' (below).',
      ),
      tableOfContentsEntryToHeader(withoutRoutingHeader),
      para(
        'Without a ',
        inlineCode('routing'),
        " config, the program doesn't manage the URL bar. This is the default for most programs.",
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
        'Copy makeApplication without routing example to clipboard',
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
            h.InnerHTML(Snippets.runMakeApplicationRoutingHighlighted),
          ],
          [],
        ),
        Snippets.runMakeApplicationRoutingRaw,
        'Copy makeApplication with routing example to clipboard',
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
      tableOfContentsEntryToHeader(makeElementHeader),
      para(
        inlineCode('makeApplication'),
        ' assumes it owns the page. It writes ',
        inlineCode('document.title'),
        ' and manages the canonical and og:url tags on every render. That is what you want for an app that owns its tab, but not for a widget embedded on a page you do not control, where it would clobber the host page metadata.',
      ),
      para(
        'Use ',
        inlineCode('makeElement'),
        ' to mount a Foldkit app scoped to its container. Its ',
        inlineCode('view'),
        ' returns ',
        inlineCode('Html'),
        ' directly rather than a ',
        inlineCode('Document'),
        ', so there is no title to discard, and the runtime never touches the document ',
        inlineCode('<head>'),
        '. Everything else (Model, ',
        inlineCode('init'),
        ', ',
        inlineCode('update'),
        ', Commands, Subscriptions, flags, crash handling) works exactly as it does with ',
        inlineCode('makeApplication'),
        '. Embedded apps do not own the URL bar, so ',
        inlineCode('makeElement'),
        ' has no ',
        inlineCode('routing'),
        ' config.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.runMakeElementHighlighted)],
          [],
        ),
        Snippets.runMakeElementRaw,
        'Copy makeElement example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
}
