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

const complexHandlersHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'complex-handlers',
  text: 'Complex Handlers',
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
  complexHandlersHeader,
  eventHandlerSideEffectsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
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
      tableOfContentsEntryToHeader(complexHandlersHeader),
      para(
        'The examples above are short, but handlers are not limited to one-liners. The rule is that a handler is a pure translator from event data to a Message, not that it stays small. For example, a keydown translator can branch on the key, read Model-derived state from view scope, and return ',
        inlineCode('Option<Message>'),
        ' so it dispatches only when the event means something:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.eventHandlingComplexHighlighted),
          ],
          [],
        ),
        Snippets.eventHandlingComplexRaw,
        'Copy complex handler example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Returning ',
        inlineCode('Some'),
        ' claims the key: the framework suppresses the browser’s default action and dispatches the Message. Returning ',
        inlineCode('None'),
        ' leaves the key to the browser. The next section covers why ',
        inlineCode('OnKeyDownPreventDefault'),
        ' runs that suppression for you.',
      ),
      para(
        'A handler never runs Effects: the runtime is the only Effect executor, and anything effectful belongs in a Command returned from update. A handler also never decides consequences: it classifies the event into a fact, like Enter with an active result meaning ',
        inlineCode('SelectedResult'),
        ', and update decides what follows from that fact.',
      ),
      para(
        'When a translator grows, extract it to a named pure function and pass it to the attribute, as the example above does with ',
        inlineCode('handleResultsKeyDown'),
        '. Foldkit’s own Listbox does the same: its keydown handler matches on Escape, Enter, Space, the navigation keys, and printable typeahead keys, with Model-derived state in scope, all as one pure function handed to ',
        inlineCode('OnKeyDownPreventDefault'),
        '.',
      ),
      tableOfContentsEntryToHeader(eventHandlerSideEffectsHeader),
      para(
        'Foldkit runs your side effects for you. Your view only declares attributes and returns Messages. Usually Foldkit defers those effects to lifecycle primitives like Commands, Subscriptions, and Mounts, which run after the current event has returned. A few effects cannot wait that long. The browser only honors them when they run synchronously, inside the originating user-gesture event handler, and a deferred primitive runs a frame too late. Foldkit handles those from inside the event attribute itself. It is still Foldkit running the effect, not your view.',
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
      para(
        'The clipboard family follows the same rule. ',
        inlineCode('OnPastePreventDefault'),
        ' hands your function the clipboard’s text/plain payload. Returning ',
        inlineCode('Some'),
        ' suppresses the browser’s default insertion and dispatches the Message carrying the pasted content; ',
        inlineCode('None'),
        ' lets the browser paste normally. ',
        inlineCode('OnCopyText'),
        ' and ',
        inlineCode('OnCutText'),
        ' go the other way: they write Model-derived text to the clipboard and call ',
        inlineCode('preventDefault'),
        ' inside the gesture, since the clipboard is only writable there. The cut variant also dispatches a Message so update can remove the cut content from the Model.',
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
      para(
        'The iOS keyboard case has one wrinkle. The element you focus has to be in the page at the instant of the tap. A search field inside a dialog is not: while the dialog is closed its input is not rendered, and opening the dialog does not help because that happens a frame later, after the gesture has ended.',
      ),
      infoCallout(
        'Focus a stand-in, then hand off',
        'Keep an always-present, visually hidden text input (the “keyboard warmup”) and point OnClickFocus at it. The tap focuses the warmup (which opens the keyboard) and dispatches a Message. update’s branch for that Message opens the dialog and returns a Dom.focus Command pointed at the real input. It runs once the dialog has mounted, so focus lands on the real input, and iOS keeps the keyboard up as focus moves between the two text inputs.',
      ),
      para(
        'These are ordinary declarative attributes, not an escape hatch into imperative code. Foldkit still owns the side effect and runs it inside the framework’s handler, so your callbacks stay pure and your Messages stay facts. Reach for them only when the browser requires a synchronous side effect inside the gesture. Anything that can wait belongs in the normal lifecycle, usually a Command.',
      ),
      para(
        'So far everything has been synchronous. The user clicks a button, update produces a new Model, the view rerenders. But real apps need side effects: HTTP requests, timers, browser APIs. That’s where Commands come in.',
      ),
    ],
  )
}
