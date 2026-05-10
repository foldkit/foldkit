import { Html, html } from 'foldkit/html'

import { Link } from '../../link'
import { Message, type TableOfContentsEntry } from '../../main'
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

const h = html<Message>()

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const animationFramesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'animation-frames',
  text: 'Animation Frames',
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
  animationFramesHeader,
  advancedHeader,
  equivalenceHeader,
  readDependenciesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  h.div(
    [],
    [
      pageTitle('core/subscriptions', 'Subscriptions'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Subscription is a reactive binding between your Model and a long-running stream: timers, ',
        inlineCode('WebSocket'),
        ' connections, keyboard input, resize observers, anything that produces a continuous stream of events. You declare which part of the Model the Subscription depends on, and Foldkit manages the stream lifecycle automatically, starting it when dependencies are met and stopping it when they change.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', a Subscription is a standing order: “keep the coffee coming for table 5.” The waiter doesn’t keep walking back to repeat the order. The kitchen knows to keep pouring until the table says stop.',
      ),
      para(
        'Commands handle one-off side effects: a slip to the kitchen that comes back with a single result. Subscriptions handle the ongoing kind. Here’s how we add auto-counting to the counter: when ',
        inlineCode('isAutoCounting'),
        ' is ',
        inlineCode('true'),
        ', a stream ticks every second, and when it flips to ',
        inlineCode('false'),
        ', the stream stops.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.counterAutoCountHighlighted),
          ],
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
      h.ul(
        [h.Class('list-disc mb-8 space-y-2')],
        [
          h.li(
            [],
            [
              inlineCode('modelToDependencies'),
              ' extracts the relevant dependencies from the Model.',
            ],
          ),
          h.li(
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
        ' function returns what happened, and the runtime feeds each Message into update. If a stream callback needs to perform a side effect before producing a Message (like calling ',
        inlineCode('event.preventDefault()'),
        '), use ',
        inlineCode('Stream.mapEffect'),
        '.',
      ),

      // ANIMATION FRAMES

      tableOfContentsEntryToHeader(animationFramesHeader),
      para(
        'For Subscriptions tied to the browser’s paint clock, ',
        inlineCode('Subscription.animationFrame'),
        ' is a ready-made helper. It emits a Message every ',
        inlineCode('requestAnimationFrame'),
        ' tick with the inter-frame delta in milliseconds, and tears the loop down when its ',
        inlineCode('isActive'),
        ' gate returns ',
        inlineCode('false'),
        '. The helper returns a Subscription field config, so it slots into ',
        inlineCode('makeSubscriptions'),
        ' alongside any other dependency. Pair with ',
        inlineCode('S.Boolean'),
        ' in your ',
        inlineCode('SubscriptionDeps'),
        ' schema.',
      ),
      para(
        'Reach for it whenever you want smooth, time-based motion driven by Model updates: physics simulations, generative art, parallax scrolling, custom interpolations. The ',
        inlineCode('deltaTime'),
        ' payload makes simulation speed independent of frame rate. Multiply per-second velocities by it and motion stays consistent on 60Hz, 120Hz, or after a tab regains focus.',
      ),
      para(
        'For discrete game ticks (where the simulation steps once every N ms regardless of refresh rate), reach for ',
        inlineCode('Stream.tick'),
        ' instead. Wall-clock cadence and display-coupled cadence are different problems: ',
        inlineCode('Stream.tick'),
        ' suits the first, ',
        inlineCode('Subscription.animationFrame'),
        ' the second. The ',
        link(exampleDetailRouter({ exampleSlug: 'snake' }), 'snake example'),
        ' uses ',
        inlineCode('Stream.tick'),
        ' for its game cadence; the ',
        link(
          exampleDetailRouter({ exampleSlug: 'canvas-art' }),
          'canvas-art example',
        ),
        ' uses ',
        inlineCode('Subscription.animationFrame'),
        ' for per-frame physics.',
      ),

      // ADVANCED

      tableOfContentsEntryToHeader(advancedHeader),
      para(
        'Consider an auto-scroll Subscription for a drag-and-drop interface. It depends on both ',
        inlineCode('isDragging'),
        ' (should the scroll loop run?) and ',
        inlineCode('clientY'),
        ' (where is the pointer?). The stream should start when dragging begins and stop when it ends, but ',
        inlineCode('clientY'),
        ' changes on every pixel of mouse movement, and by default every change restarts the stream, destroying the ',
        inlineCode('requestAnimationFrame'),
        ' loop each time.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.subscriptionEquivalenceHighlighted),
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
        inlineCode('Equivalence.Struct({ isDragging: Equivalence.Boolean })'),
        ' means two snapshots are equal if they have the same ',
        inlineCode('isDragging'),
        ' value, regardless of ',
        inlineCode('clientY'),
        '. The stream starts once when dragging begins and stops when it ends. It never restarts in between.',
      ),

      // READING LIVE DEPENDENCIES

      tableOfContentsEntryToHeader(readDependenciesHeader),
      para(
        'If the stream doesn’t restart when ',
        inlineCode('clientY'),
        ' changes, how does the rAF loop read the latest pointer position? The second argument to ',
        inlineCode('dependenciesToStream'),
        ' is ',
        inlineCode('readDependencies'),
        ': a function that returns the current deps synchronously, reflecting the latest Model state without restarting the stream.',
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
        ' directly. The stream restarts whenever they change, so they’re always current. ',
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
        'You’ve now seen how state changes flow through update, how one-off side effects work as Commands, how view code reaches the live DOM with Mount, and how ongoing streams are managed with Subscriptions. But where do the first Model and Commands come from? That’s ',
        inlineCode('init'),
        '.',
      ),
    ],
  )
