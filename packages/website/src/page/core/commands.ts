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
import {
  coreArchitectureRouter,
  coreMountRouter,
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

const commandsWithArgsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'commands-with-args',
  text: 'Commands with Args',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  anatomyHeader,
  testableByDesignHeader,
  httpRequestsHeader,
  commandsWithArgsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/commands', 'Commands'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Command is a description of a side effect: an HTTP request, a one-shot delay, a DOM focus call. The update function doesn’t actually do anything on its own. It returns data, and the Foldkit runtime reads the Commands and carries them out.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', Commands are the slips the waiter hands to the kitchen. The waiter doesn’t cook. They describe what’s needed and hand it off. The kitchen does the work and reports back when it’s done.',
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
        'So far, update has been returning an empty Commands array. Let’s put it to use. Say we want a delayed reset: when the user clicks reset, the count resets after one second:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.counterCommandsHighlighted),
          ],
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
        inlineCode('DelayReset()'),
        ', a Command that describes a one-second delay. The update function didn’t start a timer. It handed the runtime a description that says “wait one second, then send me ',
        inlineCode('CompletedDelayReset'),
        '.” The runtime does the waiting. When the delay fires, ',
        inlineCode('CompletedDelayReset'),
        ' arrives as a new Message, and update resets the count to zero.',
      ),
      para(
        'A Command is a struct with three fields: ',
        inlineCode('name'),
        ', identifying what the Command does; ',
        inlineCode('args'),
        ', the typed input record (when declared); and ',
        inlineCode('effect'),
        ', the Effect the runtime executes. You create one in two curried steps: first, declare the identity and shape with ',
        inlineCode('Command.define'),
        '; then call the result with an Effect (or with a builder that receives the typed args, when args are declared) to produce the Command value.',
      ),
      para(
        'This is the same idea as Messages. Just as ',
        inlineCode('m()'),
        ' gives a Message a name that the type system knows, ',
        inlineCode('Command.define'),
        ' gives a Command a name and shape that DevTools can display, tests can reference, and traces can track. The name and args aren’t debug strings. They’re first-class values.',
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
      para(
        'Args carry the inputs that vary per dispatch. Anything else the Effect needs comes in through the Effect itself: module-level constants live in lexical scope, app-wide dependencies arrive through Foldkit ',
        inlineCode('Resources'),
        ', model-driven handles arrive through ',
        inlineCode('ManagedResources'),
        ', and any service tag on the Effect’s context channel is pulled with ',
        inlineCode('yield*'),
        '. Args don’t have to carry every value the Effect uses; they carry the per-dispatch inputs.',
      ),
      tableOfContentsEntryToHeader(testableByDesignHeader),
      para(
        'Commands aren’t just a fancy way to organize side effects. They’re the reason Foldkit programs are easy to test. Because update is pure and Commands are data, you can simulate the entire update loop without running any Effects. Send a Message, check that the right Command was produced, resolve it with a result, and verify the Model.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.counterCommandsTestHighlighted),
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
        inlineCode('Story.Command.resolve'),
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.counterHttpCommandHighlighted),
          ],
          [],
        ),
        Snippets.counterHttpCommandRaw,
        'Copy HTTP command example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Let’s zoom in on ',
        inlineCode('FetchCount'),
        ' to see how an HTTP-backed Command takes shape. The Effect pulls ',
        inlineCode('HttpClient'),
        ' from the context, executes a typed request, decodes the JSON response with ',
        inlineCode('Schema'),
        ', and produces ',
        inlineCode('SucceededFetchCount'),
        '. Failures get caught and turned into ',
        inlineCode('FailedFetchCount'),
        ' Messages, so the runtime always sees a result. ',
        inlineCode('Effect.provide(FetchHttpClient.layer)'),
        ' wires the live implementation; tests can swap it for a mock.',
      ),
      infoCallout(
        'Errors are tracked, not hidden',
        'Commands use Effect’s typed error channel: if a Command can fail, the type signature tells you. ',
        inlineCode('Effect.catch'),
        ' turns failures into Messages like ',
        inlineCode('FailedFetchCount'),
        ', and once all errors are handled, the type confirms it. The update function handles errors the same way it handles success: as facts about what happened.',
      ),
      tableOfContentsEntryToHeader(commandsWithArgsHeader),
      para(
        'The Commands so far have taken no inputs. But many Commands need values that vary per dispatch: the zip code for a weather lookup, the element id for a focus call, the duration for a delay. Declare those values as an args schema between the Command name and the result Messages. The factory then receives them as a typed record, and call sites pass them in when dispatching.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.commandWithArgsHighlighted),
          ],
          [],
        ),
        Snippets.commandWithArgsRaw,
        'Copy command with args example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Args appear in DevTools alongside the Command name and let Story/Scene tests assert on the exact dispatch with ',
        inlineCode(
          "Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))",
        ),
        '.',
      ),
      para(
        'Commands fire once and produce one result Message when they finish (chosen from the result Messages they declare). For work bound to a specific DOM element’s lifetime, Foldkit has ',
        link(coreMountRouter(), 'Mount'),
        '.',
      ),
    ],
  )
}
