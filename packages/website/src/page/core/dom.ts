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
import { apiModuleRouter, coreCommandsRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const usingDomHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'using-dom',
  text: 'Using Dom',
}

const fullApiSurfaceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'full-api-surface',
  text: 'Full API surface',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  usingDomHeader,
  fullApiSurfaceHeader,
]

const domApiHref = apiModuleRouter({ moduleSlug: 'dom' })

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/dom', 'Dom'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('Dom'),
        ' module wraps the most common DOM operations as Effects: focusing an element, scrolling something into view, programmatically clicking, opening and closing dialogs, locking page scroll, marking surrounding elements inert. You use them inside your own ',
        link(coreCommandsRouter(), 'Commands'),
        '.',
      ),
      para(
        'Each helper is an Effect. ',
        inlineCode('Dom.focus'),
        ' returns an ',
        inlineCode('Effect.Effect<void, ElementNotFound>'),
        '; ',
        inlineCode('Dom.lockScroll'),
        ' returns an ',
        inlineCode('Effect.Effect<void>'),
        ". They gate themselves on the runtime's next render commit internally, so you can return one from ",
        inlineCode('update'),
        ' immediately after a state-changing Message and trust the element will be there.',
      ),
      tableOfContentsEntryToHeader(usingDomHeader),
      para(
        'Wrap a Dom helper in a Command at the call site. The helper produces a value (or fails with a typed error), and you map that into one of your Messages.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.domFocusHighlighted)], []),
        Snippets.domFocusRaw,
        'Copy Dom.focus example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Dom helpers that touch a specific element can fail. ',
        inlineCode('Dom.focus'),
        ', ',
        inlineCode('Dom.scrollIntoView'),
        ', ',
        inlineCode('Dom.clickElement'),
        ', and ',
        inlineCode('Dom.advanceFocus'),
        ' all fail with ',
        inlineCode('ElementNotFound'),
        ' when the selector does not match. Catch the failure with ',
        inlineCode('Effect.catch'),
        ' and turn it into a Message, or ignore it with ',
        inlineCode('Effect.ignore'),
        ' when the failure is not interesting (a stale focus call after the user has navigated away).',
      ),
      tableOfContentsEntryToHeader(fullApiSurfaceHeader),
      para(
        'The Dom module covers focus management, scrolling, dialog show/close, scroll locking, inert isolation, element movement detection, and animation settling. The ',
        link(domApiHref, 'Dom API reference'),
        ' lists every function with its signature and an inline example.',
      ),
    ],
  )
