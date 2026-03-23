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

const configurationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'configuration',
  text: 'Configuration',
}

const showHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'show',
  text: 'show',
}

const positionHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'position',
  text: 'position',
}

const modeHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'mode',
  text: 'mode',
}

const bannerHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'banner',
  text: 'banner',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  configurationHeader,
  showHeader,
  positionHeader,
  modeHeader,
  bannerHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/devtools', 'DevTools'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit includes a built-in DevTools overlay that displays every Message flowing through your app and lets you inspect the Model, Message, and Commands at any point in time. It renders inside a shadow DOM so it won\u2019t interfere with your styles or layout.',
      ),
      para(
        'You can see it in action right now \u2014 look for the tab on the bottom right edge of this page.',
      ),
      para(
        'DevTools are enabled by default in development. Pass a ',
        inlineCode('devtools'),
        ' object to ',
        inlineCode('makeProgram'),
        ' to configure behavior:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.devtoolsBasicHighlighted)],
          [],
        ),
        Snippets.devtoolsBasicRaw,
        'Configuring DevTools',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(configurationHeader),
      para(
        'The ',
        inlineCode('devtools'),
        ' field accepts an object with the following optional properties, or ',
        inlineCode('false'),
        ' to disable DevTools entirely.',
      ),
      tableOfContentsEntryToHeader(showHeader),
      para(
        inlineCode("'Development'"),
        ' (the default) enables DevTools only in development. ',
        inlineCode("'Always'"),
        ' enables them in all environments, including production.',
      ),
      tableOfContentsEntryToHeader(positionHeader),
      para(
        'Controls where the badge and panel appear on screen. One of ',
        inlineCode("'BottomRight'"),
        ' (default), ',
        inlineCode("'BottomLeft'"),
        ', ',
        inlineCode("'TopRight'"),
        ', or ',
        inlineCode("'TopLeft'"),
        '.',
      ),
      tableOfContentsEntryToHeader(modeHeader),
      para(
        inlineCode("'TimeTravel'"),
        ' (the default) enables full time-travel debugging \u2014 clicking a Message row pauses the app and re-renders it exactly as it looked at that point in time. User interaction is blocked while paused, but Subscriptions continue running in the background and new rows keep appearing in the panel. Click Resume to jump back to the live state.',
      ),
      para(
        inlineCode("'Inspect'"),
        ' lets you browse state snapshots without pausing the app, which is useful when showing DevTools to visitors in production or staging environments.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.devtoolsInspectHighlighted)],
          [],
        ),
        Snippets.devtoolsInspectRaw,
        'Inspect mode for production',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(bannerHeader),
      para(
        'An optional string displayed as a banner at the top of the panel. Useful for welcoming visitors or leaving a note for your team.',
      ),
    ],
  )
