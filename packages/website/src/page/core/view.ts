import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
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

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/view', 'View'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The view function is a pure function that transforms your model into HTML. Given the same model, it always produces the same HTML output. The view never directly modifies state — instead, it dispatches messages through event handlers.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterViewHighlighted),
          ],
          [],
        ),
        Snippets.counterViewRaw,
        'Copy view example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'Pure functions, no hook rules',
        'The view is like a functional component, but guaranteed pure — no hooks, no effects, no local state. It\'s a function from Model to Html. This simplicity means no "rules of hooks" to follow.',
      ),
      tableOfContentsEntryToHeader(typedHtmlHelpersHeader),
      para(
        "Foldkit's HTML functions are typed to your Message type. This ensures event handlers only accept valid Messages from your application. You create these helpers by calling ",
        inlineCode('html<Message>()'),
        ' and destructuring the elements and attributes you need:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.htmlHelpersHighlighted),
          ],
          [],
        ),
        Snippets.htmlHelpersRaw,
        'Copy HTML helpers example to clipboard',
        model,
        'mb-8',
      ),
      para(
        "This pattern might seem unusual if you're coming from React, but it provides strong type safety. If you try to pass an invalid Message to ",
        inlineCode('OnClick'),
        ', TypeScript will catch it at compile time. You only need to do this once per module — most apps create a single ',
        inlineCode('html.ts'),
        ' file and import from there.',
      ),
      tableOfContentsEntryToHeader(eventHandlingHeader),
      para(
        'Event handlers in Foldkit work differently from React. Instead of passing a callback function, you pass a Message. When the event fires, Foldkit dispatches that Message to your update function.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.eventHandlingHighlighted),
          ],
          [],
        ),
        Snippets.eventHandlingRaw,
        'Copy event handling example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'For simple events like clicks, you pass the Message directly. For events that carry data (like input changes), you pass a function that receives the event and returns a Message. This keeps your view declarative — it describes what Messages should be sent, not how to handle them.',
      ),
    ],
  )
