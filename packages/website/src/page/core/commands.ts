import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  coreArchitectureRouter,
  coreLifecycleHooksRouter,
  exampleDetailRouter,
  testingRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const anatomyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'anatomy-of-a-command',
  text: 'Anatomy of a Command',
}

const testableByDesignHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testable-by-design',
  text: 'Testable by Design',
}

const httpRequestsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'http-requests',
  text: 'HTTP Requests',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  anatomyHeader,
  testableByDesignHeader,
  httpRequestsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/commands', 'Commands'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Command is a description of a side effect: an HTTP request, a one-shot delay, a DOM focus call. The update function doesn\u2019t actually do anything on its own. It returns data, and the Foldkit runtime reads the Commands and carries them out.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', Commands are the slips the waiter hands to the kitchen. The waiter doesn\u2019t cook. They describe what\u2019s needed and hand it off. The kitchen does the work and reports back when it\u2019s done.',
      ),
      para(
        'When update runs, no HTTP request fires, no timer starts, no DOM changes. It returns a new Model and a list of Commands that describe what should happen, and the runtime executes them.',
      ),
      infoCallout(
        'A different model for side effects',
        'In React, event handlers do things directly: call ',
        inlineCode('fetch()'),
        ', start a timer, write to ',
        inlineCode('localStorage'),
        '. In Foldkit, update is pure. It describes what should happen and the runtime does it.',
      ),
      para(
        'So far, update has been returning an empty Commands array. Let\u2019s put it to use. Say we want a delayed reset: when the user clicks reset, the count resets after one second:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterCommandsHighlighted)],
          [],
        ),
        Snippets.counterCommandsRaw,
        'Copy commands example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(anatomyHeader),
      para(
        'Look at what update does when ',
        inlineCode('ClickedResetAfterDelay'),
        ' arrives: it returns the Model unchanged, along with ',
        inlineCode('delayReset'),
        ', a Command that describes a one-second delay. The update function didn\u2019t start a timer. It handed the runtime a description that says \u201Cwait one second, then send me ',
        inlineCode('CompletedDelayReset'),
        '.\u201D The runtime does the waiting. When the delay fires, ',
        inlineCode('CompletedDelayReset'),
        ' arrives as a new Message, and update resets the count to zero.',
      ),
      para(
        'A Command is a struct with two fields: ',
        inlineCode('name'),
        ', identifying what the Command does, and ',
        inlineCode('effect'),
        ', the Effect that the runtime executes. You create a Command in two steps: first, define its identity with ',
        inlineCode('Command.define'),
        ', then call it with an Effect to produce the Command value.',
      ),
      para(
        'This is the same idea as Messages. Just as ',
        inlineCode('m()'),
        ' gives a Message a name that the type system knows, ',
        inlineCode('Command.define'),
        ' gives a Command an identity that DevTools can display, tests can reference, and traces can track. The name isn\u2019t a debug string. It\u2019s a first-class value.',
      ),
      para(
        'Names are verb-first imperatives: ',
        inlineCode('FetchWeather'),
        ', ',
        inlineCode('FocusButton'),
        ', ',
        inlineCode('LockScroll'),
        '. Messages describe what happened (past tense), Command names are imperatives: instructions to the runtime.',
      ),
      tableOfContentsEntryToHeader(testableByDesignHeader),
      para(
        'Commands aren\u2019t just a fancy way to organize side effects. They\u2019re the reason Foldkit programs are easy to test. Because update is pure and Commands are data, you can simulate the entire update loop without running any Effects. Send a Message, check that the right Command was produced, resolve it with a result, and verify the Model.',
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
        'The test reads as a story: start from a Model with count 5, send ',
        inlineCode('ClickedResetAfterDelay()'),
        ', verify that update returned a ',
        inlineCode('DelayReset'),
        ' Command, resolve it with ',
        inlineCode('CompletedDelayReset()'),
        ', and verify the count is 0. Every step is visible. The simulation called update, resolved the Command with the Message you provided, fed that back through update, and arrived at the final state.',
      ),
      para(
        'Send Messages with ',
        inlineCode('Story.message'),
        ', resolve Commands inline with ',
        inlineCode('Story.resolve'),
        ', and assert with ',
        inlineCode('Story.model'),
        '. See the ',
        link(testingRouter(), 'Testing'),
        ' guide for the full API.',
      ),
      tableOfContentsEntryToHeader(httpRequestsHeader),
      para(
        'Now, what if we want to get the next count from an API instead of incrementing locally? We can create a Command that performs the HTTP request and returns a Message when it completes:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterHttpCommandHighlighted)],
          [],
        ),
        Snippets.counterHttpCommandRaw,
        'Copy HTTP command example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'Using fetch for simplicity',
        'This example wraps ',
        inlineCode('fetch'),
        ' in ',
        inlineCode('Effect.tryPromise'),
        ' to keep the focus on Commands. For real applications, we recommend Effect\u2019s ',
        inlineCode('HttpClient'),
        ' module. It gives you typed errors, request and response schemas, retries, and ',
        inlineCode('Layer'),
        '-based configuration. See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'weather' }),
          'Weather example',
        ),
        ' for a real ',
        inlineCode('HttpClient'),
        ' usage: ',
        inlineCode('fetchWeather'),
        ' builds requests with ',
        inlineCode('HttpClientRequest.get'),
        ', runs them through ',
        inlineCode('client.execute'),
        ', and decodes the response with ',
        inlineCode('S.decodeUnknown'),
        '. Whatever Effect produces the value, the Command shape stays the same.',
      ),
      para(
        'Let\u2019s zoom in on ',
        inlineCode('fetchCount'),
        ' to understand what\u2019s happening here:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterHttpCommandFetchCountHighlighted),
          ],
          [],
        ),
        Snippets.counterHttpCommandFetchCountRaw,
        'Copy HTTP command fetchCount example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'Errors are tracked, not hidden',
        'Commands use Effect\u2019s typed error channel: if a Command can fail, the type signature tells you. ',
        inlineCode('Effect.catchAll'),
        ' turns failures into Messages like ',
        inlineCode('FailedFetchCount'),
        ', and once all errors are handled, the type confirms it. The update function handles errors the same way it handles success: as facts about what happened.',
      ),
      para(
        'Commands fire once and produce a single Message when they finish. For one-shot work bound to a specific DOM element, Foldkit has ',
        link(coreLifecycleHooksRouter(), 'Mount'),
        '. For effects that run continuously (a timer that ticks every second, a ',
        inlineCode('WebSocket'),
        ' that stays open, keyboard input), Foldkit has Subscriptions.',
      ),
    ],
  )
