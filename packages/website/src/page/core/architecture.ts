import { Html, html } from 'foldkit/html'

import { Link } from '../../link'
import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreDevToolsRouter, testingRouter } from '../../route'
import { comparisonTable } from '../../view/table'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const theLoopHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-loop',
  text: 'The Loop',
}

const definitionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'definitions',
  text: 'Definitions',
}

const theRestaurantAnalogyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-restaurant-analogy',
  text: 'The Restaurant Analogy',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  theLoopHeader,
  definitionsHeader,
  theRestaurantAnalogyHeader,
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/architecture', 'Architecture'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'In most TypeScript UI frameworks, each component manages its own state and effects. In Foldkit, there’s a single state tree. Every change flows in one direction through the same loop.',
      ),
      para(
        'This pattern is called ',
        link(Link.elmArchitecture, 'The Elm Architecture'),
        '. You don’t need to know Elm. Foldkit adapts it for TypeScript and Effect.',
      ),
      tableOfContentsEntryToHeader(theLoopHeader),
      para(
        'Every Foldkit app runs the same loop. A ',
        inlineCode('Message'),
        ' arrives: the user clicked a button, a timer fired, an HTTP response came back. The ',
        inlineCode('update'),
        ' function receives the current ',
        inlineCode('Model'),
        ' and the Message and returns a new Model along with any ',
        inlineCode('Command'),
        's to execute. The ',
        inlineCode('view'),
        ' function renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.',
      ),
      h.ul(
        [h.Class('list-disc mb-4 space-y-3 ml-6')],
        [
          h.li(
            [],
            [
              h.strong([], ['Commands:']),
              ' descriptions of one-shot side effects: HTTP requests, focus operations, ',
              inlineCode('localStorage'),
              ' writes, navigation calls. The Foldkit runtime executes them and sends their results back as new Messages, feeding them into the same loop. Each Command carries a name, which surfaces in ',
              link(coreDevToolsRouter(), 'DevTools'),
              ', ',
              link(testingRouter(), 'tests'),
              ', and tracing.',
            ],
          ),
          h.li(
            [],
            [
              h.strong([], ['Mount:']),
              ' the moment an element from the view enters the live DOM. Mount is the seam where view code can drop down to imperative work with the live element: portaling an overlay to the document body, attaching observers, handing the element to a third-party library that owns its own DOM. ',
              inlineCode('Mount.define'),
              ' runs an Effect that emits a single Message at acquire; ',
              inlineCode('Mount.defineStream'),
              ' runs a Stream of Messages from observers or listeners on the element. The runtime dispatches results back through ',
              inlineCode('update'),
              ' and runs the paired cleanup when the element unmounts.',
            ],
          ),
          h.li(
            [],
            [
              h.strong([], ['Subscriptions:']),
              ' a scoped Stream gated by a slice of your Model. You are subscribed to the Model, not to an external event source. The runtime keeps the Stream alive while the slice holds its value and starts a fresh scope when the slice changes. The body usually plugs an external source (timer ticks, keypresses, ',
              inlineCode('WebSocket'),
              ' frames, system theme changes) into a Stream that flows back through ',
              inlineCode('update'),
              ' as Messages. Some Subscriptions emit no Messages and instead maintain DOM state for their lifetime, like setting ',
              inlineCode('user-select: none'),
              ' while a drag is active.',
            ],
          ),
          h.li(
            [],
            [
              h.strong([], ['ManagedResources:']),
              ' declarations of a resource (a camera stream, a ',
              inlineCode('WebSocket'),
              ' connection, a Web Worker pool) made available to Commands and Subscriptions while a slice of the Model holds a particular value. The runtime acquires the resource when the slice says it should be alive, releases it when the slice says it should not, and dispatches Messages for each lifecycle transition. Commands and Subscriptions consume the resource as a typed handle (capturing a photo from the camera, sending a frame on the socket), with ',
              inlineCode('ResourceNotAvailable'),
              ' rather than a crash if the handle is not currently available.',
            ],
          ),
        ],
      ),
      para(
        'That’s it. Every state transition in your app flows through a single loop. There’s no action-at-a-distance, no hidden state mutation, no effect that runs outside the cycle. If you want to know how the app got into its current state, you follow the Messages.',
      ),
      para('The complete cycle looks like this:'),
      h.pre(
        [
          h.Class(
            'mb-4 mx-auto w-fit max-w-full text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          ),
        ],
        [
          '          +------------------------------------------------------+\n' +
            '          |                                                      |\n' +
            '          ↓                                                      |\n' +
            '       Message                                                   |\n' +
            '          |                                                      |\n' +
            '          ↓                                                      |\n' +
            '  +---------------+                                              |\n' +
            '  |    update     |                                              |\n' +
            '  +-------+-------+                                              |\n' +
            '  ↓               ↓                                              |\n' +
            'Model    Command<Message>[]                                      |\n' +
            '  |               |                                              |\n' +
            '  |               +-> Runtime -----------------------------------+\n' +
            '  |                                                              |\n' +
            '  +-> view -> Browser -> user events ----------------------------+\n' +
            '  |                                                              |\n' +
            '  +-> view -> Mount(Element) -> Effect<Message> -> Runtime ------+\n' +
            '  |                                                              |\n' +
            '  +-> Subscriptions -> Stream<Message> -> Runtime ---------------+\n' +
            '  |                                                              |\n' +
            '  +-> ManagedResources -> acquire/release Messages -> Runtime ---+',
        ],
      ),
      para(
        'Every path on the right side produces a Message that feeds back into ',
        inlineCode('update'),
        '. Five sources: Commands, the Browser, Mount, Subscriptions, and ManagedResources. One loop.',
      ),
      para(
        'Sitting beneath the loop are Resources: app-lifetime singletons like ',
        inlineCode('AudioContext'),
        ', ',
        inlineCode('RTCPeerConnection'),
        ', or ',
        inlineCode('CanvasRenderingContext2D'),
        ' that Commands draw on. Resources don’t produce Messages themselves. They’re the ambient dependencies the Message-producing parts need to do their work.',
      ),
      tableOfContentsEntryToHeader(definitionsHeader),
      para('Each concept in one place, in plain terms:'),
      comparisonTable(
        ['Concept', 'Definition'],
        [
          [
            ['Model'],
            [
              'The single data structure that holds your entire application state.',
            ],
          ],
          [
            ['Message'],
            [
              'A fact about something that happened: a button was clicked, a key was pressed, a request succeeded with a payload.',
            ],
          ],
          [
            ['update'],
            [
              'A pure function that receives the current Model and a Message and returns a new Model along with any Commands to execute.',
            ],
          ],
          [
            ['view'],
            [
              'A pure function that renders the Model as HTML. User interactions produce Messages that flow back into update.',
            ],
          ],
          [
            ['Command'],
            [
              'A description of a one-shot side effect. The runtime executes it and sends the result back as one of its declared Messages.',
            ],
          ],
          [
            ['Mount'],
            [
              'The seam where view code reaches a live DOM element. Mount.define runs an Effect that emits a single Message at acquire; Mount.defineStream runs a Stream of Messages from observers on the element. The runtime dispatches results through update and runs the paired cleanup on unmount.',
            ],
          ],
          [
            ['Subscription'],
            [
              'A scoped Stream gated by a slice of your Model. The runtime keeps it alive while the slice holds its value and starts a fresh scope when the slice changes. The body usually pipes external events back as Messages; some Subscriptions emit nothing and just maintain DOM state for the subscription’s lifetime.',
            ],
          ],
          [
            ['Resource'],
            [
              'An app-lifetime singleton (an AudioContext, an RTCPeerConnection, a CanvasRenderingContext2D) that Commands can draw on. A dependency, not a Message source.',
            ],
          ],
          [
            ['ManagedResource'],
            [
              'Like a Resource, but scoped to a window of Model state instead of the app lifetime: a WebSocket connection while the user is on a chat page, a camera stream during a video call. Commands and Subscriptions consume it as a typed handle while it’s live; the runtime acquires it on entry, releases it on exit, and dispatches Messages for each lifecycle transition.',
            ],
          ],
          [
            ['Runtime'],
            [
              'The Foldkit engine that executes Commands, runs Subscriptions, manages resource and mount lifecycles, and routes Messages back into update.',
            ],
          ],
          [
            ['Submodel'],
            [
              'A self-contained Model, Message, update, and Commands that a parent embeds as a field and delegates to in update. Submodels are how an app grows past a single update function: each Foldkit UI component (Menu, Listbox, DatePicker, etc.) ships as one, and you build your own for feature pages, repeated forms, or any unit of composition. Children surface high-level facts to parents through an OutMessage in the third tuple element of update.',
            ],
          ],
        ],
      ),
      tableOfContentsEntryToHeader(theRestaurantAnalogyHeader),
      para(
        'Think of a Foldkit app like a restaurant. The waiter keeps a notebook: a running picture of everything happening right now. Table 3 ordered the salmon. Table 5 is waiting for dessert. When something happens (a customer flags the waiter, the kitchen rings the bell), the waiter hears about it, updates their notebook, and maybe writes a slip for the kitchen. The waiter doesn’t cook the salmon. They hand the slip to the kitchen, and the kitchen reports back when it’s done.',
      ),
      para(
        'Messages work the same way. “Table 3 asked for the check” is a fact given to the waiter, not an instruction. The waiter decides what to do: maybe bring the check immediately, maybe offer dessert first. The message stays the same either way.',
      ),
      infoCallout(
        'The restaurant analogy',
        'This analogy maps to every concept you’ll encounter in Core Concepts. The table below is a reference you can come back to as you read.',
      ),
      comparisonTable(
        ['Foldkit', 'Restaurant'],
        [
          [
            ['Model'],
            ['The waiter’s notebook: the current state of everything'],
          ],
          [
            ['Message'],
            ['Something that happens: “table 3 asked for the check”'],
          ],
          [
            ['update'],
            [
              'The waiter: hears what happened, updates the notebook, maybe writes a slip',
            ],
          ],
          [
            ['view'],
            [
              'What the customers actually see: plates on the table, the check arriving',
            ],
          ],
          [['Command'], ['A slip for the kitchen: “prepare the salmon”']],
          [
            ['Mount'],
            [
              'Tableside flambé: rolled out to a specific table the moment its dish arrives, rolled away when the plate is cleared',
            ],
          ],
          [
            ['Subscription'],
            ['A standing order: “keep the coffee coming for table 5”'],
          ],
          [
            ['Resource'],
            [
              'Kitchen equipment: the oven, the stand mixer, the deep fryer. Turned on when the kitchen opens and available to every dish.',
            ],
          ],
          [
            ['ManagedResource'],
            [
              'A specialty station: set up when the menu features the seafood special, broken down when the special ends',
            ],
          ],
          [['Runtime'], ['The kitchen: does the work, reports back when done']],
        ],
      ),
      para(
        'That’s the architecture in the abstract. The next page shows a complete counter application: the core of the loop (a Model, Messages, ',
        inlineCode('update'),
        ', ',
        inlineCode('init'),
        ', and ',
        inlineCode('view'),
        ') wired together and running.',
      ),
    ],
  )
}
