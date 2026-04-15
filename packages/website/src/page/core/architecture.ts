import type { Html } from 'foldkit/html'

import { Class, div, pre } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
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

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('core/architecture', 'Architecture'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'In most TypeScript UI frameworks, each component manages its own state and effects. In Foldkit, there\u2019s a single state tree. Every change flows in one direction through the same loop.',
      ),
      para(
        'This pattern is called ',
        link(Link.elmArchitecture, 'The Elm Architecture'),
        '. You don\u2019t need to know Elm \u2014 Foldkit adapts it for TypeScript and Effect.',
      ),
      tableOfContentsEntryToHeader(theLoopHeader),
      para(
        'Every Foldkit app runs the same loop. A ',
        inlineCode('Message'),
        ' arrives \u2014 the user clicked a button, a timer fired, an HTTP response came back. The ',
        inlineCode('update'),
        ' function receives the current ',
        inlineCode('Model'),
        ' and the Message and returns a new Model along with any ',
        inlineCode('Command'),
        's to execute. The ',
        inlineCode('view'),
        ' function renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.',
      ),
      para(
        'Commands are descriptions of one-shot side effects \u2014 HTTP requests, focus operations, ',
        inlineCode('localStorage'),
        ' writes, navigation calls. The Foldkit runtime executes them and sends their results back as new Messages, feeding them into the same loop. Each Command carries a name, which surfaces in tracing and tests.',
      ),
      para(
        'Subscriptions are continuous streams of Messages from external sources \u2014 keypresses, recurring timers, ',
        inlineCode('WebSocket'),
        ' frames, window resize events. Where a Command runs once and reports back, a Subscription stays active for as long as the Model says it should, and the stream decides which source events become Messages.',
      ),
      para(
        'ManagedResources have an acquire/release lifecycle tied to Model state \u2014 a camera stream during a video call, a ',
        inlineCode('WebSocket'),
        ' connection while the user is on a chat page. The runtime acquires them when the Model enters the relevant state, releases them when it leaves, and dispatches Messages for each transition.',
      ),
      para(
        'That\u2019s it. Every state transition in your app flows through a single loop. There\u2019s no action-at-a-distance, no hidden state mutation, no effect that runs outside the cycle. If you want to know how the app got into its current state, you follow the Messages.',
      ),
      para('The complete cycle looks like this:'),
      pre(
        [
          Class(
            'mb-4 mx-auto w-fit max-w-full text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          ),
        ],
        [
          '          +------------------------------------------+\n' +
            '          |                                          |\n' +
            '          \u2193                                          |\n' +
            '       Message                                       |\n' +
            '          |                                          |\n' +
            '          \u2193                                          |\n' +
            '  +---------------+                                  |\n' +
            '  |    update     |                                  |\n' +
            '  +-------+-------+                                  |\n' +
            '  \u2193               \u2193                                  |\n' +
            'Model    Command<Message>[]                          |\n' +
            '  |               |                                  |\n' +
            '  |               +-> Runtime -----------------------+\n' +
            '  |                                                  |\n' +
            '  +-> view -> Browser -> user events ----------------+\n' +
            '  |                                                  |\n' +
            '  +-> Subscriptions -> Stream<Message> -> Runtime ---+\n' +
            '  |                                                  |\n' +
            '  +-> ManagedResources -> lifecycle -----------------+',
        ],
      ),
      para(
        'Every path on the right side produces a Message that feeds back into ',
        inlineCode('update'),
        '. Four sources \u2014 Commands, Subscriptions, ManagedResources, and the Browser \u2014 one loop.',
      ),
      para(
        'Sitting beneath the loop are Resources: app-lifetime singletons like ',
        inlineCode('AudioContext'),
        ', ',
        inlineCode('RTCPeerConnection'),
        ', or ',
        inlineCode('CanvasRenderingContext2D'),
        ' that Commands draw on. Resources don\u2019t produce Messages themselves \u2014 they\u2019re the ambient dependencies the Message-producing parts need to do their work.',
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
              'A fact about something that happened \u2014 a button was clicked, a key was pressed, a request succeeded with a payload.',
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
              'A description of a one-shot side effect. The runtime executes it and sends the result back as a Message.',
            ],
          ],
          [
            ['Subscription'],
            [
              'A continuous stream of Messages from an external source, active for as long as the Model says it should be.',
            ],
          ],
          [
            ['Resource'],
            [
              'An app-lifetime singleton \u2014 an AudioContext, an RTCPeerConnection, a CanvasRenderingContext2D \u2014 that Commands can draw on. A dependency, not a Message source.',
            ],
          ],
          [
            ['ManagedResource'],
            [
              'Like a Resource, but scoped to a window of Model state instead of the app lifetime \u2014 a WebSocket connection while the user is on a chat page, a camera stream during a video call. Commands access it as a typed service while it\u2019s live; the runtime acquires it on entry, releases it on exit, and dispatches Messages for each lifecycle transition.',
            ],
          ],
          [
            ['Runtime'],
            [
              'The Foldkit engine that executes Commands, runs Subscriptions, manages resource lifecycles, and routes Messages back into update.',
            ],
          ],
        ],
      ),
      tableOfContentsEntryToHeader(theRestaurantAnalogyHeader),
      para(
        'Think of a Foldkit app like a restaurant. The waiter keeps a notebook \u2014 a running picture of everything happening right now. Table 3 ordered the salmon. Table 5 is waiting for dessert. When something happens \u2014 a customer flags the waiter, the kitchen rings the bell \u2014 the waiter hears about it, updates their notebook, and maybe writes a slip for the kitchen. The waiter doesn\u2019t cook the salmon \u2014 they hand the slip to the kitchen, and the kitchen reports back when it\u2019s done.',
      ),
      para(
        'Messages work the same way. \u201CTable 3 asked for the check\u201D is a fact given to the waiter, not an instruction. The waiter decides what to do \u2014 maybe bring the check immediately, maybe offer dessert first. The message stays the same either way.',
      ),
      infoCallout(
        'The restaurant analogy',
        'This analogy maps to every concept you\u2019ll encounter in Core Concepts. The table below is a reference you can come back to as you read.',
      ),
      comparisonTable(
        ['Foldkit', 'Restaurant'],
        [
          [
            ['Model'],
            [
              'The waiter\u2019s notebook \u2014 the current state of everything',
            ],
          ],
          [
            ['Message'],
            ['Something that happens: \u201Ctable 3 asked for the check\u201D'],
          ],
          [
            ['update'],
            [
              'The waiter \u2014 hears what happened, updates the notebook, maybe writes a slip',
            ],
          ],
          [
            ['view'],
            [
              'What the customers actually see \u2014 plates on the table, the check arriving',
            ],
          ],
          [
            ['Command'],
            ['A slip for the kitchen: \u201Cprepare the salmon\u201D'],
          ],
          [
            ['Subscription'],
            [
              'A standing order: \u201Ckeep the coffee coming for table 5\u201D',
            ],
          ],
          [
            ['Resource'],
            [
              'Kitchen equipment \u2014 the oven, the stand mixer, the deep fryer. Turned on when the kitchen opens and available to every dish.',
            ],
          ],
          [
            ['ManagedResource'],
            [
              'A specialty station \u2014 set up when the menu features the seafood special, broken down when the special ends',
            ],
          ],
          [
            ['Runtime'],
            ['The kitchen \u2014 does the work, reports back when done'],
          ],
        ],
      ),
      para(
        'That\u2019s the architecture in the abstract. The next page shows a complete counter application \u2014 and you\u2019ll see each of these pieces in the code.',
      ),
    ],
  )
