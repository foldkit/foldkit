import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  coreArchitectureRouter,
  exampleDetailRouter,
  uiDragAndDropRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const advancedHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'advanced',
  text: 'Advanced',
}

const equivalenceHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'custom-equivalence',
  text: 'Custom Equivalence',
}

const readDependenciesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'reading-live-dependencies',
  text: 'Reading Live Dependencies',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  advancedHeader,
  equivalenceHeader,
  readDependenciesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/subscriptions', 'Subscriptions'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Commands handle one-off side effects \u2014 a slip to the kitchen that comes back with a result. But what about ongoing streams? In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', a Subscription is a standing order: \u201Ckeep the coffee coming for table 5.\u201D The waiter doesn\u2019t keep walking back to repeat the order \u2014 the kitchen knows to keep pouring until the table says stop. Anything that produces a continuous stream of events \u2014 timers, ',
        inlineCode('WebSocket'),
        ' connections, keyboard input, resize observers \u2014 is a Subscription.',
      ),
      para(
        'A Subscription is a reactive binding between your Model and a long-running stream. You declare which part of the Model the Subscription depends on, and Foldkit manages the stream lifecycle automatically \u2014 starting it when dependencies are met, stopping it when they change.',
      ),
      para(
        'Here\u2019s how we add auto-counting to the counter. When ',
        inlineCode('isAutoCounting'),
        ' is ',
        inlineCode('true'),
        ', a stream ticks every second. When it flips to ',
        inlineCode('false'),
        ', the stream stops.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterAutoCountHighlighted)],
          [],
        ),
        Snippets.counterAutoCountRaw,
        'Copy subscription example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The key concept is ',
        inlineCode('SubscriptionDeps'),
        '. This schema defines what parts of the Model your Subscriptions depend on. Each Subscription has two functions:',
      ),
      ul(
        [Class('list-disc mb-8 space-y-2')],
        [
          li(
            [],
            [
              inlineCode('modelToDependencies'),
              ' extracts the relevant dependencies from the Model.',
            ],
          ),
          li(
            [],
            [
              inlineCode('dependenciesToStream'),
              ' creates a stream based on those dependencies.',
            ],
          ),
        ],
      ),
      para(
        'Foldkit structurally compares the dependencies between model updates. The stream is only restarted when the dependencies actually change, not on every model update.',
      ),
      para(
        'When ',
        inlineCode('isAutoCounting'),
        ' changes from ',
        inlineCode('false'),
        ' to ',
        inlineCode('true'),
        ', the stream starts ticking. When it changes back to ',
        inlineCode('false'),
        ', the stream stops. Foldkit handles all the lifecycle management for you.',
      ),
      para(
        'For a more complex example using ',
        inlineCode('WebSocket'),
        ' connections, see the ',
        link(
          exampleDetailRouter({ exampleSlug: 'websocket-chat' }),
          'websocket-chat example',
        ),
        '. For a full real-world application, check out ',
        link(Link.typingTerminal, 'Typing Terminal'),
        ' (',
        link(Link.typingTerminalSource, 'source'),
        ').',
      ),
      para(
        'Subscriptions produce a ',
        inlineCode('Stream<Message>'),
        '. Your ',
        inlineCode('dependenciesToStream'),
        ' function returns what happened, and the runtime feeds each Message into update. If a stream callback needs to perform a side effect before producing a Message \u2014 like calling ',
        inlineCode('event.preventDefault()'),
        ' \u2014 use ',
        inlineCode('Stream.mapEffect'),
        '.',
      ),

      // ADVANCED

      tableOfContentsEntryToHeader(advancedHeader),
      para(
        'Consider an auto-scroll Subscription for a drag-and-drop interface. It depends on both ',
        inlineCode('isDragging'),
        ' (should the scroll loop run?) and ',
        inlineCode('clientY'),
        ' (where is the pointer?). The stream should start when dragging begins and stop when it ends \u2014 but ',
        inlineCode('clientY'),
        ' changes on every pixel of mouse movement, and by default every change restarts the stream, destroying the ',
        inlineCode('requestAnimationFrame'),
        ' loop each time.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.subscriptionEquivalenceHighlighted),
          ],
          [],
        ),
        Snippets.subscriptionEquivalenceRaw,
        'Copy advanced subscription example to clipboard',
        copiedSnippets,
        'mb-8',
      ),

      // CUSTOM EQUIVALENCE

      tableOfContentsEntryToHeader(equivalenceHeader),
      para(
        'The ',
        inlineCode('equivalence'),
        ' field overrides the default structural comparison with an ',
        inlineCode('Equivalence'),
        ' from Effect, letting you choose which fields trigger a restart. ',
        inlineCode('Equivalence.struct({ isDragging: Equivalence.boolean })'),
        ' means two snapshots are equal if they have the same ',
        inlineCode('isDragging'),
        ' value, regardless of ',
        inlineCode('clientY'),
        '. The stream starts once when dragging begins and stops when it ends \u2014 it never restarts in between.',
      ),

      // READING LIVE DEPENDENCIES

      tableOfContentsEntryToHeader(readDependenciesHeader),
      para(
        'If the stream doesn\u2019t restart when ',
        inlineCode('clientY'),
        ' changes, how does the rAF loop read the latest pointer position? The second argument to ',
        inlineCode('dependenciesToStream'),
        ' is ',
        inlineCode('readDependencies'),
        ' \u2014 a function that returns the current deps synchronously, reflecting the latest Model state without restarting the stream.',
      ),
      para(
        'Inside the ',
        inlineCode('requestAnimationFrame'),
        ' loop, ',
        inlineCode('readDependencies()'),
        ' returns the latest snapshot every frame. This is the bridge between the stream lifecycle (which gates on the deps that trigger restarts) and browser callbacks (which need synchronous access to the latest state).',
      ),
      para(
        'In most Subscriptions, use ',
        inlineCode('deps'),
        ' directly \u2014 the stream restarts whenever they change, so they\u2019re always current. ',
        inlineCode('readDependencies'),
        ' is for the case where ',
        inlineCode('equivalence'),
        ' has excluded fast-changing fields from the restart decision, and you need to read those fields inside a long-lived callback. For a real-world example, see the ',
        link(uiDragAndDropRouter(), 'Drag and Drop'),
        ' component and the ',
        link(exampleDetailRouter({ exampleSlug: 'kanban' }), 'Kanban example'),
        '.',
      ),
      para(
        'You\u2019ve now seen how state changes flow through update, how one-off side effects work as Commands, and how ongoing streams are managed with Subscriptions. But where do the first Model and Commands come from? That\u2019s ',
        inlineCode('init'),
        '.',
      ),
    ],
  )
