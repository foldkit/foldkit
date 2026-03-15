import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
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
      pageTitle('core/error-view', 'Error View'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'When Foldkit hits an unrecoverable error during ',
        inlineCode('update'),
        ', ',
        inlineCode('view'),
        ', or Command execution, it stops all processing and renders a fallback UI. This is not error handling \u2014 there is no recovery from this state. The runtime is dead.',
      ),
      para(
        'By default, Foldkit shows a built-in error screen with the error message and a reload button. Pass an ',
        inlineCode('errorView'),
        ' function to ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ' to customize it. It receives the ',
        inlineCode('Error'),
        ' and returns ',
        inlineCode('Html'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.errorViewCustomHighlighted)],
          [],
        ),
        Snippets.errorViewCustomRaw,
        'Custom errorView example',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Call ',
        inlineCode('html<never>()'),
        ' with ',
        inlineCode('never'),
        ' as the type parameter. Since the runtime has stopped, no messages will ever be dispatched \u2014 ',
        inlineCode('never'),
        ' makes this explicit and prevents event handlers like ',
        inlineCode('OnClick'),
        ' from being used.',
      ),
      para(
        'Foldkit\u2019s event handlers like ',
        inlineCode('OnClick'),
        ' work by dispatching Messages to the runtime. Since the runtime has stopped, those handlers are silently ignored. For interactivity, like a reload button, use ',
        inlineCode("Attribute('onclick', 'location.reload()')"),
        '. This sets a raw DOM event handler directly on the element, bypassing Foldkit\u2019s dispatch system entirely.',
      ),
      infoCallout(
        'Only in errorView',
        'In a normal Foldkit app, always use ',
        inlineCode('OnClick'),
        ' with Messages \u2014 never raw DOM event attributes. ',
        inlineCode('errorView'),
        ' is the one exception because the runtime is no longer running.',
      ),
      para(
        'If your custom ',
        inlineCode('errorView'),
        ' itself throws an error, Foldkit catches it and falls back to the default error screen showing both the original error and the ',
        inlineCode('errorView'),
        ' error.',
      ),
      para(
        'See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'error-view' }),
          'error-view example',
        ),
        ' for a working demonstration.',
      ),
      para(
        'Error views handle the worst case. For the common case — keeping your app fast — the next two pages cover how Foldkit warns you about slow views during development and how to memoize expensive subtrees.',
      ),
    ],
  )
