import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreArchitectureRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const h = html<Message>()

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

const eventHandlerSideEffectsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'event-handler-side-effects',
  text: 'Event Handler Side Effects',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  typedHtmlHelpersHeader,
  eventHandlingHeader,
  eventHandlerSideEffectsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  h.div(
    [],
    [
      pageTitle('core/view', 'View'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The view function turns your Model into HTML. The user doesn’t see the Model directly. They see what view renders from it.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', the waiter’s notebook says “table 3: salmon, ready.” The view is what’s actually on the table: the plate in front of the customer.',
      ),
      para(
        'Given the same Model, view always produces the same HTML. It never modifies state directly. Instead, it dispatches Messages through event handlers, feeding them back into the loop.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.counterViewHighlighted)],
          [],
        ),
        Snippets.counterViewRaw,
        'Copy view example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'No hook rules',
        'In React, functional components can hold local state and run effects via hooks, which come with ordering rules you have to follow. In Foldkit, view is guaranteed pure: no hooks, no effects, no local state. It’s a function from Model to Html.',
      ),
      tableOfContentsEntryToHeader(typedHtmlHelpersHeader),
      para(
        'Foldkit’s HTML functions are typed to your Message type. This ensures event handlers only accept valid Messages from your application. Bind the factory once per module by calling ',
        inlineCode('html<Message>()'),
        ', then reach for ',
        inlineCode('h.div'),
        ', ',
        inlineCode('h.OnClick'),
        ', and the rest off the returned record:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.htmlHelpersHighlighted)],
          [],
        ),
        Snippets.htmlHelpersRaw,
        'Copy HTML helpers example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This gives you strong type safety: if you try to pass an invalid Message to ',
        inlineCode('h.OnClick'),
        ', TypeScript catches it at compile time. Each view module binds its own ',
        inlineCode('h'),
        ' against the Message type it dispatches.',
      ),
      para(
        'In a child view that should be agnostic to its parent, take ',
        inlineCode('ParentMessage'),
        ' as a function generic and bind ',
        inlineCode('html<ParentMessage>()'),
        ' inside. The view stays decoupled from any particular parent and composes through the ',
        inlineCode('toParentMessage'),
        ' callback the parent supplies.',
      ),
      tableOfContentsEntryToHeader(eventHandlingHeader),
      para(
        'When the customer flags the waiter, that’s a Message. In the view, event handlers work the same way. Instead of imperative callbacks that modify state, you pass a Message, or a function that maps an event to a Message.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.eventHandlingHighlighted)],
          [],
        ),
        Snippets.eventHandlingRaw,
        'Copy event handling example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'For simple events like clicks, you pass the Message directly. For events that carry data (like input changes), you pass a function that receives the event and returns a Message. This keeps your view declarative. It describes what Messages should be sent, not how to handle them.',
      ),
      tableOfContentsEntryToHeader(eventHandlerSideEffectsHeader),
      para(
        'Almost every side effect in a Foldkit app belongs in a Command. The view stays pure, it dispatches a Message, and the runtime decides what to do next. There is one narrow exception: side effects the browser requires to run synchronously inside the originating user-gesture event handler. A Command runs after the gesture has already returned, so the browser ignores it.',
      ),
      para(
        'Two cases show up in practice. ',
        inlineCode('event.preventDefault()'),
        ' must run synchronously to suppress a default browser action like form submission or scroll. ',
        inlineCode('.focus()'),
        ' on iOS Safari only opens the on-screen keyboard if it runs inside the gesture; the same call from a Command resolves a frame later and the keyboard never appears.',
      ),
      para(
        'Foldkit exposes these as attribute primitives. ',
        inlineCode('OnKeyDownPreventDefault'),
        ' takes a function returning ',
        inlineCode('Option<Message>'),
        '. When the function returns ',
        inlineCode('Some'),
        ', the framework calls ',
        inlineCode('preventDefault'),
        ' and dispatches the Message. ',
        inlineCode('OnClickFocus'),
        ' takes a selector and a Message; it synchronously focuses the element matching the selector and then dispatches.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.eventHandlerSideEffectsHighlighted),
          ],
          [],
        ),
        Snippets.eventHandlerSideEffectsRaw,
        'Copy event handler side effects example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'Pair OnClickFocus with an always-rendered input',
        'For the iOS keyboard case, the input you focus must already exist in the DOM when the click fires. If a dialog conditionally renders its content, render a hidden text input outside the dialog and point OnClickFocus at it. A follow-up Dom.focus Command can transfer focus to the real input once the dialog mounts. iOS keeps the keyboard up across a programmatic focus transfer between two text inputs.',
      ),
      para(
        'The architectural principle holds. The side effect is encapsulated inside the framework, not scattered across view code. Your callbacks remain pure and your Messages remain facts. Reach for these primitives only when the browser requires a synchronous side effect inside the gesture. Anything that can wait belongs in a Command.',
      ),
      para(
        'So far everything has been synchronous. The user clicks a button, update produces a new Model, the view rerenders. But real apps need side effects: HTTP requests, timers, browser APIs. That’s where Commands come in.',
      ),
    ],
  )
