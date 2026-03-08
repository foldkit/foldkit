import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  callout,
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

const typedHtmlHelpersHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'typed-html-helpers',
  text: 'Typed HTML Helpers',
}

const eventHandlingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'event-handling',
  text: 'Event Handling',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  typedHtmlHelpersHeader,
  eventHandlingHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/view', 'View'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The update function produces a new Model. But the user doesn\u2019t see the Model \u2014 they see what the view function renders from it. In the restaurant analogy, the waiter\u2019s notebook says "table 3: salmon, ready." The view is what\u2019s actually on the table \u2014 the plate in front of the customer.',
      ),
      para(
        'Given the same Model, view always produces the same HTML. It never modifies state directly \u2014 instead, it dispatches Messages through event handlers, feeding them back into the loop.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.counterViewHighlighted)], []),
        Snippets.counterViewRaw,
        'Copy view example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      callout(
        'No hook rules',
        'In React, functional components can hold local state and run effects via hooks, which come with ordering rules you have to follow. In Foldkit, view is guaranteed pure \u2014 no hooks, no effects, no local state. It\u2019s a function from Model to Html.',
      ),
      tableOfContentsEntryToHeader(typedHtmlHelpersHeader),
      para(
        "Foldkit's HTML functions are typed to your Message type. This ensures event handlers only accept valid Messages from your application. You create these helpers by calling ",
        inlineCode('html<Message>()'),
        ' and destructuring the elements and attributes you need:',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.htmlHelpersHighlighted)], []),
        Snippets.htmlHelpersRaw,
        'Copy HTML helpers example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This gives you strong type safety \u2014 if you try to pass an invalid Message to ',
        inlineCode('OnClick'),
        ', TypeScript catches it at compile time. You only need to do this once per module \u2014 most apps create a single ',
        inlineCode('html.ts'),
        ' file and import from there.',
      ),
      tableOfContentsEntryToHeader(eventHandlingHeader),
      para(
        'When the customer flags the waiter, that\u2019s a Message. In the view, event handlers work the same way \u2014 instead of imperative callbacks that modify state, you pass a Message, or a function that maps an event to a Message.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.eventHandlingHighlighted)], []),
        Snippets.eventHandlingRaw,
        'Copy event handling example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'For simple events like clicks, you pass the Message directly. For events that carry data (like input changes), you pass a function that receives the event and returns a Message. This keeps your view declarative — it describes what Messages should be sent, not how to handle them.',
      ),
      para(
        "So far everything has been synchronous — the user clicks a button, update produces a new Model, the view rerenders. But real apps need side effects: HTTP requests, timers, browser APIs. That's where Commands come in.",
      ),
    ],
  )
