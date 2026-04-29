import { Html } from 'foldkit/html'

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
  apiModuleRouter,
  coreCommandsRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreResourcesRouter,
  coreSubscriptionsRouter,
  testingRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whySideEffectsFreeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'why-zero-side-effects',
  text: 'Why Zero Side Effects?',
}

const commonMistakesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'common-mistakes',
  text: 'Common Mistakes',
}

const pureFunctionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'pure-functions',
  text: 'Pure Functions Everywhere',
}

const viewIsPureHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-is-pure',
  text: 'View is Pure',
}

const updateIsPureHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'update-is-pure',
  text: 'Update is Pure',
}

const requestingValuesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'requesting-values',
  text: 'Requesting Values',
}

const dontComputeInUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'dont-compute-in-update',
  text: 'Don\u2019t Compute in Update',
}

const requestViaCommandHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'request-via-command',
  text: 'Request Via Command',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whySideEffectsFreeHeader,
  commonMistakesHeader,
  pureFunctionsHeader,
  viewIsPureHeader,
  updateIsPureHeader,
  requestingValuesHeader,
  dontComputeInUpdateHeader,
  requestViaCommandHeader,
]

const taskLink = (hash: string, label: string) =>
  link(`${apiModuleRouter({ moduleSlug: 'task' })}#${hash}`, label)

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle(
        'best-practices/side-effects-and-purity',
        'Side Effects & Purity',
      ),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Correct Foldkit programs have zero side effects, period. Yes, zero (0).',
      ),
      para(
        'Every side effect is described as an Effect: a value that represents a computation without executing it. An Effect does nothing when you construct it. It produces side effects when the Foldkit runtime runs your program.',
      ),
      para(
        'Both ',
        inlineCode('view'),
        ' and ',
        inlineCode('update'),
        ' are pure functions. They take inputs and return outputs without touching the outside world.',
      ),
      para('You encapsulate side effects in exactly five places:'),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              link(coreCommandsRouter(), 'Commands'),
              ': an Effect that performs a side effect and returns a Message. HTTP requests, DOM operations, reading from storage. This is where most of your side effects live.',
            ],
          ),
          li(
            [],
            [
              link(`${coreInitAndFlagsRouter()}#flags`, 'flags'),
              ': an Effect that returns the initial data your program needs to start. Reading from local storage, detecting browser capabilities, or fetching configuration.',
            ],
          ),
          li(
            [],
            [
              link(coreSubscriptionsRouter(), 'Subscription'),
              ' streams: a ',
              inlineCode('Stream<Message>'),
              '. Subscriptions model ongoing processes like keyboard events, window resizing, or intersection observers. When a stream callback needs to perform a side effect before producing a Message (like calling ',
              inlineCode('event.preventDefault()'),
              '), use ',
              inlineCode('Stream.mapEffect'),
              '. The runtime controls when streams subscribe and unsubscribe based on your Model.',
            ],
          ),
          li(
            [],
            [
              link(coreResourcesRouter(), 'Resources'),
              ': an Effect Layer that provides long-lived services to your Commands. One-time setup like creating an AudioContext or opening a database connection.',
            ],
          ),
          li(
            [],
            [
              link(coreManagedResourcesRouter(), 'Managed Resources'),
              ': ',
              inlineCode('acquire'),
              ' and ',
              inlineCode('release'),
              ' Effects for stateful resources that activate and deactivate based on your Model. Camera streams, WebSocket connections, media recorders.',
            ],
          ),
        ],
      ),
      para(
        'That\u2019s it. Every side effect in your program is an Effect value, managed by the runtime. Your logic is pure.',
      ),
      tableOfContentsEntryToHeader(whySideEffectsFreeHeader),
      para('Foldkit gains powerful guarantees from zero side effects:'),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              'DevTools replay: the DevTools can replay any sequence of Messages against your ',
              inlineCode('update'),
              ' function because it\u2019s pure. If ',
              inlineCode('update'),
              ' had side effects, replaying would double-fire them.',
            ],
          ),
          li(
            [],
            [
              'Time-travel debugging: you can jump to any point in your app\u2019s history and see exactly what the Model looked like, because each state is a deterministic function of the previous state plus the Message.',
            ],
          ),
          li(
            [],
            [
              'Predictability: reading ',
              inlineCode('update'),
              ' tells you everything about how a Message changes the Model. There are no hidden effects, no action-at-a-distance, no callbacks firing behind the scenes.',
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(commonMistakesHeader),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              inlineCode('console.log'),
              ' in ',
              inlineCode('update'),
              ': ',
              inlineCode('console.log'),
              ' during development is fine for quick debugging. But production logging or error monitoring is a side effect that belongs in a Command. It will fire again during DevTools replay, and you want structured control over what gets reported.',
            ],
          ),
          li(
            [],
            [
              inlineCode('Date.now()'),
              ' in ',
              inlineCode('update'),
              ': calling ',
              inlineCode('Date.now()'),
              ' breaks purity because the same Model and Message produce different results depending on when they run. Request the current time via a Command using ',
              taskLink('const-Task/getTime', 'Task.getTime'),
              ', ',
              taskLink('const-Task/getZonedTime', 'Task.getZonedTime'),
              ', or ',
              taskLink('function-Task/getZonedTimeIn', 'Task.getZonedTimeIn'),
              ' and return it as a Message.',
            ],
          ),
          li(
            [],
            [
              inlineCode('fetch'),
              ' in ',
              inlineCode('view'),
              ': the view is called on every render. Instead, return a Command from ',
              inlineCode('update'),
              ' that fetches your data and returns a Message. Handle the Message to update your Model.',
            ],
          ),
          li(
            [],
            [
              'DOM access anywhere: reading ',
              inlineCode('document.getElementById'),
              ' or ',
              inlineCode('window.innerWidth'),
              ' breaks purity. Use Subscriptions for reactive values, or Commands for one-off reads.',
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(pureFunctionsHeader),
      tableOfContentsEntryToHeader(viewIsPureHeader),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li([], ['No hooks, no lifecycle methods']),
          li([], ['No fetching data, no timers, no subscriptions']),
          li([], ['Given the same Model, always returns the same Html']),
        ],
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.viewPureBadHighlighted)], []),
        Snippets.viewPureBadRaw,
        'Copy bad view example to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.viewPureGoodHighlighted)],
          [],
        ),
        Snippets.viewPureGoodRaw,
        'Copy good view example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(updateIsPureHeader),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              'Returns a new Model and a list of Commands. It doesn\u2019t execute anything. Each Command carries a name for tracing and testing. Foldkit runs the provided Commands.',
            ],
          ),
          li([], ['No mutations, no side effects']),
          li(
            [],
            [
              'Given the same Model and Message, always returns the same result',
            ],
          ),
        ],
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.updatePureBadHighlighted)],
          [],
        ),
        Snippets.updatePureBadRaw,
        'Copy bad update example to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.updatePureGoodHighlighted)],
          [],
        ),
        Snippets.updatePureGoodRaw,
        'Copy good update example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This purity has a practical payoff: testing is trivial. Foldkit ships ',
        inlineCode('foldkit/test'),
        ': a simulation module that lets you send Messages, declare Command resolvers, and assert on the Model in a single pipe chain. See the ',
        link(testingRouter(), 'Testing'),
        ' guide for the full API.',
      ),
      tableOfContentsEntryToHeader(requestingValuesHeader),
      para(
        'A common mistake is computing random or time-based values directly in ',
        inlineCode('update'),
        '. This breaks purity. Calling the function twice with the same inputs would return different results.',
      ),
      tableOfContentsEntryToHeader(dontComputeInUpdateHeader),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.pureUpdateBadHighlighted)],
          [],
        ),
        Snippets.pureUpdateBadRaw,
        'Copy bad example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(requestViaCommandHeader),
      para(
        'Instead, return a Command that generates the value and sends it back as a Message:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.pureUpdateGoodHighlighted)],
          [],
        ),
        Snippets.pureUpdateGoodRaw,
        'Copy good example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This \u201Crequest/response\u201D pattern keeps ',
        inlineCode('update'),
        ' pure. The ',
        inlineCode('RequestedApple'),
        ' handler always returns the same result. It just emits a Command. The actual random generation happens in the Effect, and the result comes back via ',
        inlineCode('GeneratedApple'),
        '.',
      ),
      para(
        'See the ',
        link(Link.exampleSnakeRequestPattern, 'Snake example'),
        ' for a complete implementation of this pattern.',
      ),
    ],
  )
