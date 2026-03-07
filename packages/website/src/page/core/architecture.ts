import type { Html } from 'foldkit/html'

import { div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  callout,
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

const theRestaurantAnalogyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-restaurant-analogy',
  text: 'The Restaurant Analogy',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  theLoopHeader,
  theRestaurantAnalogyHeader,
]

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('core/architecture', 'Architecture'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'In most TypeScript UI frameworks, each component manages its own state and effects. In Foldkit, there\u2019s a single state tree; every change flows in one direction through the same loop.',
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
        'Commands are descriptions of side effects \u2014 HTTP requests, timers, browser API calls. The Foldkit runtime executes them and sends their results back as new Messages, feeding them into the same loop.',
      ),
      para(
        'That\u2019s it. ',
        inlineCode(
          'Message \u2192 update \u2192 Model + Commands \u2192 view \u2192 Message',
        ),
        '. Every state transition in your app flows through this single loop. There\u2019s no action-at-a-distance, no hidden state mutation, no effect that runs outside the cycle. If you want to know how the app got into its current state, you follow the Messages.',
      ),
      tableOfContentsEntryToHeader(theRestaurantAnalogyHeader),
      para(
        'Think of a Foldkit app like a restaurant. The waiter keeps a notebook \u2014 a running picture of everything happening right now. Table 3 ordered the salmon. Table 5 is waiting for dessert. When something happens \u2014 a customer flags the waiter, the kitchen rings the bell \u2014 the waiter hears about it, updates their notebook, and maybe writes a slip for the kitchen. The waiter doesn\u2019t cook the salmon \u2014 they hand the slip to the kitchen, and the kitchen reports back when it\u2019s done.',
      ),
      para(
        'Messages work the same way. "Table 3 asked for the check" is a fact given to the waiter, not an instruction. The waiter decides what to do \u2014 maybe bring the check immediately, maybe offer dessert first. The message stays the same either way.',
      ),
      callout(
        'The restaurant analogy',
        "This analogy maps to every concept you'll encounter in Core Concepts. The table below is a reference you can come back to as you read.",
      ),
      comparisonTable(
        ['Your App', 'The Restaurant'],
        [
          [
            ['Model'],
            [
              "The waiter's notebook \u2014 the current state of everything",
            ],
          ],
          [
            ['Message'],
            ['Something that happens: "table 3 asked for the check"'],
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
            ['A slip for the kitchen: "prepare the salmon"'],
          ],
          [
            ['Subscription'],
            [
              'A standing order: "keep the coffee coming for table 5"',
            ],
          ],
          [
            ['Runtime'],
            [
              'The kitchen \u2014 does the work, reports back when done',
            ],
          ],
        ],
      ),
      para(
        "That's the architecture in the abstract. The next page shows a complete counter application \u2014 and you'll see each of these pieces in the code.",
      ),
    ],
  )
