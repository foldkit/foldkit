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
  coreManagedResourcesRouter,
  coreMountRouter,
  exampleDetailRouter,
  patternsSubscriptionOrganizationRouter,
  uiDragAndDropRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const autoCounterHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'auto-counter-example',
  text: 'Auto-Counter Example',
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
  autoCounterHeader,
  animationFramesHeader,
  advancedHeader,
  equivalenceHeader,
  readDependenciesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/subscriptions', 'Subscriptions'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Subscription binds a slice of your Model to a scoped Stream that may emit Messages. You name a slice of the Model via ',
        inlineCode('modelToDependencies'),
        ', and Foldkit runs the body of work in ',
        inlineCode('dependenciesToStream'),
        ' as a scoped Effect for exactly as long as that slice holds its dependency-equivalent value. When the slice changes, the scope closes (running any registered ',
        inlineCode('Effect.acquireRelease'),
        ' finalizers), and a fresh scope opens with the new dependencies.',
      ),
      h.pre(
        [
          h.Class(
            'mb-4 mx-auto w-fit max-w-full text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          ),
        ],
        [
          '               Model\n' +
            '                 |\n' +
            '                 | modelToDependencies(model)\n' +
            '                 ↓\n' +
            '            Dependencies\n' +
            '                 |\n' +
            '                 | equivalence check vs. previous\n' +
            '                 ↓\n' +
            '            +----------+\n' +
            '            | changed? |\n' +
            '            +----+-----+\n' +
            '                 |\n' +
            '           +-----+------+\n' +
            '           |            |\n' +
            '          yes           no\n' +
            '           |            |\n' +
            '           ↓            ↓\n' +
            '    close current   scope continues\n' +
            '        scope        (no restart)\n' +
            '   (finalizers run)\n' +
            '           |\n' +
            '           ↓\n' +
            '   open fresh scope\n' +
            '           |\n' +
            '           ↓\n' +
            '   +----------------------------+\n' +
            '   |    dependenciesToStream    |\n' +
            '   |  (deps, readDependencies)  |\n' +
            '   +-------------+--------------+\n' +
            '                 |\n' +
            '                 ↓\n' +
            '          Stream<Message>\n' +
            '                 |\n' +
            '                 ↓\n' +
            '               update',
        ],
      ),
      para(
        'This inverts the usual "subscribe to an event source" framing. The thing you are subscribed to is the Model, not the ',
        inlineCode('WebSocket'),
        ', not the timer, not the document event. External event sources are what your Effect happens to USE during the subscription’s lifetime; they are not the thing being subscribed to. The common shape plugs an external source into the Stream’s queue so events flow back into ',
        inlineCode('update'),
        ' as Messages (timer ticks, document keydowns, ',
        inlineCode('WebSocket'),
        ' frames, system theme changes). Some Subscriptions emit no Messages and just maintain DOM state for the subscription’s lifetime (setting ',
        inlineCode('user-select: none'),
        ' while a drag is active, applying ',
        inlineCode('aria-hidden'),
        ' to the document root while a modal is open). Both are valid uses of the same primitive because both are scoped Effect activity gated by a Model condition. See ',
        link(Link.dragAndDropDocumentStyles, 'documentDragStyles'),
        ' for the DOM-state-only shape in production.',
      ),
      para(
        'For events tied to a specific element’s existence (scroll listeners, IntersectionObservers, ResizeObservers on a particular element), use ',
        link(coreMountRouter(), 'Mount'),
        '. Mount provides the element handle directly and binds the scope to element lifetime. For stateful long-lived handles your Commands consume (the ',
        inlineCode('WebSocket'),
        ' connection itself, a camera stream, a third-party library instance), use ',
        link(coreManagedResourcesRouter(), 'ManagedResource'),
        '. ManagedResource is Subscription’s sibling: same Model-gated lifetime, both dispatch Messages. The discriminator is whether other parts of the program need a typed handle to the underlying resource. Subscription’s Messages flow from inside the body of work during the subscribed lifetime (timer ticks, document keydowns, ',
        inlineCode('WebSocket'),
        ' frames as they arrive). ManagedResource dispatches Messages at lifecycle transitions (',
        inlineCode('onAcquired'),
        ', ',
        inlineCode('onReleased'),
        ', ',
        inlineCode('onAcquireError'),
        ') AND exposes the acquired value as a typed handle Commands access via ',
        inlineCode('yield*'),
        '.',
      ),
      para(
        'Because the Stream factory is an Effect, it can do DOM side effects directly when the work must be synchronous with the event itself. Calling ',
        inlineCode('preventDefault'),
        ' on a keydown listener is the canonical case: routing the event through ',
        inlineCode('update'),
        ' would arrive after the browser had committed the default. Do the DOM mutation in a synchronous Effect that runs in the same call stack as the browser’s event dispatch. ',
        inlineCode('Stream.mapEffect'),
        ' with ',
        inlineCode('Effect.sync'),
        ' is the typical shape when you also want to transform the event into a Message; ',
        inlineCode('Stream.tap'),
        ' is the typical shape when the mutation is the entire point and no Message follows.',
      ),
      tableOfContentsEntryToHeader(autoCounterHeader),
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
        'Each entry is built by calling ',
        inlineCode('entry'),
        ' with two arguments. The first is a field map describing the dependency shape (the same shape you would pass to ',
        inlineCode('S.Struct'),
        '). The second is an object with two callbacks:',
      ),
      h.ul(
        [h.Class('list-disc mb-8 space-y-2')],
        [
          h.li(
            [],
            [
              inlineCode('modelToDependencies'),
              ' extracts the dependencies from the Model.',
            ],
          ),
          h.li(
            [],
            [
              inlineCode('dependenciesToStream'),
              ' creates a Stream of Messages from those dependencies.',
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
        'For a more complex example consuming a ',
        inlineCode('WebSocket'),
        ' message stream, see the ',
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
        '. The helper returns a complete Subscription entry (its dependencies are ',
        inlineCode('{ isActive: boolean }'),
        '), so it slots into ',
        inlineCode('Subscription.make'),
        ' as a single line alongside any other entries.',
      ),
      para(
        'Reach for it whenever you want smooth, time-based motion driven by Model updates: physics simulations, generative art, parallax scrolling, custom interpolations. The ',
        inlineCode('deltaTime'),
        ' payload makes simulation speed independent of frame rate. Multiply per-second velocities by it and motion stays consistent on 60Hz, 120Hz, or after a tab regains focus.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.subscriptionAnimationFrameHighlighted),
          ],
          [],
        ),
        Snippets.subscriptionAnimationFrameRaw,
        'Copy animation frame example to clipboard',
        copiedSnippets,
        'mb-8',
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
        inlineCode('keepAliveEquivalence'),
        ' field overrides the default structural comparison with an ',
        inlineCode('Equivalence'),
        ' from Effect, letting you choose which fields are allowed to change without restarting the stream. ',
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
        ': a function that returns the current dependencies synchronously, reflecting the latest Model state without restarting the stream.',
      ),
      para(
        'Inside the ',
        inlineCode('requestAnimationFrame'),
        ' loop, ',
        inlineCode('readDependencies()'),
        ' returns the latest snapshot every frame. This is the bridge between the stream lifecycle (which gates on the dependencies that trigger restarts) and browser callbacks (which need synchronous access to the latest state).',
      ),
      para(
        'In most Subscriptions, use the dependencies passed as the first argument directly. The stream restarts whenever they change, so they’re always current. ',
        inlineCode('readDependencies'),
        ' is for the case where ',
        inlineCode('keepAliveEquivalence'),
        ' has excluded fast-changing fields from the restart decision, and you need to read those fields inside a long-lived callback. For a real-world example, see the ',
        link(uiDragAndDropRouter(), 'Drag and Drop'),
        ' component and the ',
        link(exampleDetailRouter({ exampleSlug: 'kanban' }), 'Kanban example'),
        '.',
      ),
      para(
        'When a parent Submodel embeds children that emit Subscriptions, the parent owns the wrap into its own Message type. ',
        inlineCode('Subscription.lift'),
        ' handles this composition in one call. See ',
        link(
          patternsSubscriptionOrganizationRouter(),
          'Subscription Organization',
        ),
        ' for the full pattern.',
      ),
      para(
        'You’ve now seen how state changes flow through update, how one-off side effects work as Commands, how view code reaches the live DOM with Mount, and how ongoing streams are managed with Subscriptions. But where do the first Model and Commands come from? That’s ',
        inlineCode('init'),
        '.',
      ),
    ],
  )
}
