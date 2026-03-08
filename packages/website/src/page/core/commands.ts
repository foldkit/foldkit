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
import {
  type CopiedSnippets,
  highlightedCodeBlock,
} from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const httpRequestsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'http-requests',
  text: 'HTTP Requests',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  httpRequestsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/commands', 'Commands'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'So far, update has been returning an empty Commands array. It\u2019s time to put it to use. But before we write our first Command, there\u2019s a fundamental idea to understand: the update function doesn\u2019t actually do anything.',
      ),
      para(
        'In the restaurant analogy, Commands are the slips the waiter hands to the kitchen. The waiter doesn\u2019t cook \u2014 they describe what\u2019s needed and hand it off. The kitchen does the work and reports back when it\u2019s done.',
      ),
      para(
        'When update runs, no HTTP request fires, no timer starts, no DOM changes. It returns data \u2014 a new Model and a list of Commands that describe what should happen. The Foldkit runtime reads those descriptions and executes them.',
      ),
      callout(
        'A different model for side effects',
        'In React, event handlers do things directly \u2014 call ',
        inlineCode('fetch()'),
        ', start a timer, write to ',
        inlineCode('localStorage'),
        '. In Foldkit, update is pure. It describes what should happen and the runtime does it.',
      ),
      para(
        "Let's see what that looks like. Say we want a delayed reset — when the user clicks reset, the count resets after one second:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterCommandsHighlighted),
          ],
          [],
        ),
        Snippets.counterCommandsRaw,
        'Copy commands example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Look at what update does when ',
        inlineCode('ClickedResetAfterDelay'),
        " arrives: it returns the Model unchanged, along with a Command that describes a one-second delay. The update function didn't start a timer — it handed the runtime a description that says ",
        '"wait one second, then send me ',
        inlineCode('ElapsedResetDelay'),
        '." The runtime does the waiting. When the delay fires, ',
        inlineCode('ElapsedResetDelay'),
        ' arrives as a new Message, and update resets the count to zero.',
      ),
      para(
        'This separation has a practical consequence: you can test your entire state machine without mocking anything.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterCommandsTestHighlighted),
          ],
          [],
        ),
        Snippets.counterCommandsTestRaw,
        'Copy test example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'No fake timers. No test utilities. No setup or teardown. You call update with a Model and a Message, and you check what comes out. The first assertion proves that update described work without doing it \u2014 the count is still 5. The second proves that when the result arrives, the state transitions correctly.',
      ),
      para(
        'This tests the state machine in isolation. In the future, Foldkit may provide a program-level test runner that simulates the full runtime loop \u2014 executing Commands, feeding results back through update, and asserting on the rendered view \u2014 all without a browser.',
      ),
      tableOfContentsEntryToHeader(httpRequestsHeader),
      para(
        'Now, what if we want to get the next count from an API instead of incrementing locally? We can create a Command that performs the HTTP request and returns a Message when it completes:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterHttpCommandHighlighted),
          ],
          [],
        ),
        Snippets.counterHttpCommandRaw,
        'Copy HTTP command example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        "Let's zoom in on ",
        inlineCode('fetchCount'),
        " to understand what's happening here:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(
              Snippets.counterHttpCommandFetchCountHighlighted,
            ),
          ],
          [],
        ),
        Snippets.counterHttpCommandFetchCountRaw,
        'Copy HTTP command fetchCount example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      callout(
        'Errors are tracked, not hidden',
        'Commands use Effect\u2019s typed error channel \u2014 if a Command can fail, the type signature tells you. ',
        inlineCode('Effect.catchAll'),
        ' turns failures into Messages like ',
        inlineCode('FailedCountFetch'),
        ', and once all errors are handled, the type confirms it. The update function handles errors the same way it handles success: as facts about what happened.',
      ),
      para(
        'Commands fire once and produce a single Message when they finish. But what about effects that run continuously — a timer that ticks every second, a ',
        inlineCode('WebSocket'),
        ' that stays open, keyboard input? For ongoing streams, Foldkit has Subscriptions.',
      ),
    ],
  )
