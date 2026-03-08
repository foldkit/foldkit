import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import {
  type CopiedSnippets,
  highlightedCodeBlock,
} from '../view/codeBlock'

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

const testingUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'testing-update',
  text: 'Testing Update Functions',
}

const requestingValuesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'requesting-values',
  text: 'Requesting Values',
}

const dontComputeInUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'dont-compute-in-update',
  text: "Don't Compute in Update",
}

const requestViaCommandHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'request-via-command',
  text: 'Request Via Command',
}

const immutableUpdatesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'immutable-updates',
  text: 'Immutable Updates with evo',
}

const messagesAsEventsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'messages-as-events',
  text: 'Messages as Events',
}

const goodMessageNamesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'good-message-names',
  text: 'Good Message Names',
}

const avoidTheseHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'avoid-these',
  text: 'Avoid These',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  pureFunctionsHeader,
  viewIsPureHeader,
  updateIsPureHeader,
  testingUpdateHeader,
  requestingValuesHeader,
  dontComputeInUpdateHeader,
  requestViaCommandHeader,
  immutableUpdatesHeader,
  messagesAsEventsHeader,
  goodMessageNamesHeader,
  avoidTheseHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('best-practices', 'Best Practices'),
      para(
        'Foldkit requires a different way of thinking than most TypeScript frameworks. These patterns will help you write maintainable applications.',
      ),
      tableOfContentsEntryToHeader(pureFunctionsHeader),
      para(
        'In Foldkit, both ',
        inlineCode('view'),
        ' and ',
        inlineCode('update'),
        ' are pure functions. They take inputs and return outputs without side effects.',
      ),
      tableOfContentsEntryToHeader(viewIsPureHeader),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li([], ['No hooks, no lifecycle methods']),
          li([], ['No fetching data, no timers, no subscriptions']),
          li(
            [],
            ['Given the same Model, always returns the same Html'],
          ),
        ],
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.viewPureBadHighlighted),
          ],
          [],
        ),
        Snippets.viewPureBadRaw,
        'Copy bad view example to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.viewPureGoodHighlighted),
          ],
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
              "Returns a new Model and a list of Commands — doesn't execute anything. Foldkit runs the provided commands.",
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
          [
            Class('text-sm'),
            InnerHTML(Snippets.updatePureBadHighlighted),
          ],
          [],
        ),
        Snippets.updatePureBadRaw,
        'Copy bad update example to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.updatePureGoodHighlighted),
          ],
          [],
        ),
        Snippets.updatePureGoodRaw,
        'Copy good update example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Side effects happen in ',
        'Commands',
        '. A Command is an Effect that describes a side effect — fetch this URL, wait 500ms, read from storage. Your ',
        inlineCode('update'),
        " function doesn't execute anything; it just returns data describing what should happen. Foldkit's runtime takes those Commands, executes them, and feeds the results back as Messages.",
      ),
      para(
        "This means side effects still happen — you're not avoiding them. But they happen in a contained environment managed by the runtime, not scattered throughout your code. Your business logic stays pure: given the same inputs, it always returns the same outputs. The impurity is pushed to the edges.",
      ),
      para(
        'Unlike React where side effects can trigger during render (',
        inlineCode('useEffect'),
        '), Foldkit side effects only happen in response to Messages. This separation makes your code predictable and testable.',
      ),
      tableOfContentsEntryToHeader(testingUpdateHeader),
      para(
        "Foldkit's pure update model makes testing painless because state transitions are just function calls — pass in a Model and Message, assert on the returned Model. And because Commands are Effects with explicit dependencies, you can swap in mocks without reaching for libraries like ",
        link(Link.msw, 'msw'),
        ' or stubbing globals:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.testingUpdateHighlighted),
          ],
          [],
        ),
        Snippets.testingUpdateRaw,
        'Copy testing example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'See the ',
        link(Link.exampleWeatherTests, 'Weather example tests'),
        ' for a complete implementation.',
      ),
      tableOfContentsEntryToHeader(requestingValuesHeader),
      para(
        'A common mistake is computing random or time-based values directly in ',
        inlineCode('update'),
        '. This breaks purity — calling the function twice with the same inputs would return different results.',
      ),
      tableOfContentsEntryToHeader(dontComputeInUpdateHeader),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.pureUpdateBadHighlighted),
          ],
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
          [
            Class('text-sm'),
            InnerHTML(Snippets.pureUpdateGoodHighlighted),
          ],
          [],
        ),
        Snippets.pureUpdateGoodRaw,
        'Copy good example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This "request/response" pattern keeps ',
        inlineCode('update'),
        ' pure. The ',
        inlineCode('RequestedAppleSpawn'),
        ' handler always returns the same result — it just emits a Command. The actual random generation happens in the Effect, and the result comes back via ',
        inlineCode('GotApplePosition'),
        '.',
      ),
      para(
        'See the ',
        link(Link.exampleSnakeRequestPattern, 'Snake example'),
        ' for a complete implementation of this pattern.',
      ),
      tableOfContentsEntryToHeader(immutableUpdatesHeader),
      para(
        'Foldkit provides ',
        inlineCode('evo'),
        " for immutable model updates. It wraps Effect's ",
        inlineCode('Struct.evolve'),
        " with stricter type checking — if you remove or rename a key from your Model, you'll get type errors everywhere you try to update it.",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.evoExampleHighlighted),
          ],
          [],
        ),
        Snippets.evoExampleRaw,
        'Copy evo example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Each property in the transform object is a function that takes the current value and returns the new value. Properties not included remain unchanged.',
      ),
      tableOfContentsEntryToHeader(messagesAsEventsHeader),
      para(
        'Messages describe ',
        'what happened',
        ', not ',
        'what to do',
        '. Name them as verb-first, past-tense events where the prefix acts as a category marker: ',
        inlineCode('Clicked*'),
        ' for button presses, ',
        inlineCode('Updated*'),
        ' for input changes, ',
        inlineCode('Requested*'),
        ' for async triggers, ',
        inlineCode('Got*'),
        ' for data responses. For example, ',
        inlineCode('ClickedFormSubmit'),
        ' and ',
        inlineCode('RemovedCartItem'),
        ' rather than imperative commands like ',
        inlineCode('SubmitForm'),
        ' or ',
        inlineCode('RemoveFromCart'),
        '.',
      ),
      tableOfContentsEntryToHeader(goodMessageNamesHeader),
      ul(
        [Class('list-disc mb-4 space-y-1 font-mono text-sm')],
        [
          li([], ['ClickedAddToCart']),
          li([], ['ChangedSearchInput']),
          li([], ['ReceivedUserData']),
        ],
      ),
      tableOfContentsEntryToHeader(avoidTheseHeader),
      ul(
        [Class('list-disc mb-6 space-y-1 font-mono text-sm')],
        [
          li([], ['SetCartItems']),
          li([], ['UpdateSearchText']),
          li([], ['MutateUserState']),
        ],
      ),
      para(
        'The ',
        inlineCode('update'),
        ' function decides how to handle a Message. The Message itself is just a fact about what occurred.',
      ),
    ],
  )
