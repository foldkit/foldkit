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
  warningCallout,
} from '../prose'
import { patternsOutMessageRouter } from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

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
  text: 'Don\u2019t Compute in Update',
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

const everyMessageCarriesMeaningHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'every-message-carries-meaning',
  text: 'Every Message Carries Meaning',
}

const keyingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keying',
  text: 'Keying',
}

const keyingRouteViewsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keying-route-views',
  text: 'Route Views',
}

const keyingLayoutBranchesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keying-layout-branches',
  text: 'Layout Branches',
}

const keyingModelStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keying-model-state',
  text: 'Model State Branches',
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
  everyMessageCarriesMeaningHeader,
  keyingHeader,
  keyingRouteViewsHeader,
  keyingLayoutBranchesHeader,
  keyingModelStateHeader,
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
              'Returns a new Model and a list of Commands \u2014 doesn\u2019t execute anything. Foldkit runs the provided commands.',
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
        'Side effects happen in ',
        'Commands',
        '. A Command is an Effect that describes a side effect — fetch this URL, wait 500ms, read from storage. Your ',
        inlineCode('update'),
        ' function doesn\u2019t execute anything; it just returns data describing what should happen. Foldkit\u2019s runtime takes those Commands, executes them, and feeds the results back as Messages.',
      ),
      para(
        'This means side effects still happen \u2014 you\u2019re not avoiding them. But they happen in a contained environment managed by the runtime, not scattered throughout your code. Your business logic stays pure: given the same inputs, it always returns the same outputs. The impurity is pushed to the edges.',
      ),
      para(
        'Unlike React where side effects can trigger during render (',
        inlineCode('useEffect'),
        '), Foldkit side effects only happen in response to Messages. This separation makes your code predictable and testable.',
      ),
      tableOfContentsEntryToHeader(testingUpdateHeader),
      para(
        'Foldkit\u2019s pure update model makes testing painless because state transitions are just function calls \u2014 pass in a Model and Message, assert on the returned Model. And because Commands are Effects with explicit dependencies, you can swap in mocks without reaching for libraries like ',
        link(Link.msw, 'msw'),
        ' or stubbing globals:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.testingUpdateHighlighted)],
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
        ' with stricter type checking \u2014 if you remove or rename a key from your Model, you\u2019ll get type errors everywhere you try to update it.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.evoExampleHighlighted)], []),
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
        inlineCode('Succeeded*'),
        '/',
        inlineCode('Failed*'),
        ' for command results that can meaningfully fail, ',
        inlineCode('Completed*'),
        ' for fire-and-forget Command acknowledgments, ',
        inlineCode('Got*'),
        ' for child module results via the ',
        link(patternsOutMessageRouter(), 'OutMessage'),
        ' pattern. For example, ',
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
      tableOfContentsEntryToHeader(everyMessageCarriesMeaningHeader),
      para(
        'Never use a generic ',
        inlineCode('NoOp'),
        ' Message. Every Message should describe what happened, even for fire-and-forget Commands where the update function is a no-op. For example, when a focus Command completes, use ',
        inlineCode('CompletedButtonFocus'),
        '. When scroll is locked, use ',
        inlineCode('CompletedScrollLock'),
        '. When an internal navigation finishes, use ',
        inlineCode('CompletedInternalNavigation'),
        '.',
      ),
      para(
        'Notice that this is the opposite of how you name Commands. ',
        inlineCode('lockScroll'),
        ' reads as an instruction because it is one \u2014 Commands are imperative, verb-first: ',
        inlineCode('lockScroll'),
        ', ',
        inlineCode('focusButton'),
        ', ',
        inlineCode('showModal'),
        '. The resulting Message flips the order because it\u2019s a fact, not an instruction: ',
        inlineCode('CompletedScrollLock'),
        ', ',
        inlineCode('CompletedButtonFocus'),
        ', ',
        inlineCode('CompletedDialogShow'),
        '. Object-first naming also puts the distinguishing word earlier \u2014 instead of scanning past ',
        inlineCode('CompletedFocus*'),
        ' three times to find ',
        inlineCode('CompletedFocusButton'),
        ' as distinct from ',
        inlineCode('CompletedFocusItems'),
        ', you see ',
        inlineCode('CompletedButtonFocus'),
        ' and ',
        inlineCode('CompletedItemsFocus'),
        ' where the second word immediately tells you what was affected.',
      ),
      para(
        'This turns the DevTools timeline from a wall of identical ',
        inlineCode('NoOp'),
        ' entries into a readable narrative: ',
        inlineCode('Opened'),
        ' \u2192 ',
        inlineCode('CompletedItemsFocus'),
        ', ',
        inlineCode('CompletedScrollLock'),
        ', ',
        inlineCode('CompletedInertSetup'),
        '. Every line tells you what happened in your application.',
      ),
      tableOfContentsEntryToHeader(keyingHeader),
      para(
        'Foldkit uses ',
        link(Link.snabbdom, 'Snabbdom'),
        ' for virtual DOM diffing. When a view branches into structurally different trees in the same DOM position, Snabbdom will try to patch one tree into the other. This causes stale input state, mismatched event handlers, broken focus, and bugs that are extremely hard to track down.',
      ),
      warningCallout(
        'Always key branch points',
        'Any time your view switches between structurally different trees \u2014 routes, layouts, or model states \u2014 wrap the branch in a ',
        inlineCode('keyed'),
        ' element. Without it, the virtual DOM patches instead of replacing, which causes subtle and hard-to-diagnose bugs.',
      ),
      para(
        'The ',
        inlineCode('keyed'),
        ' function tells Snabbdom that when the key changes, the old tree should be fully removed and the new tree inserted fresh \u2014 no diffing, no patching, no carryover. In React, this happens automatically when component types differ. In Foldkit, you opt in explicitly.',
      ),
      tableOfContentsEntryToHeader(keyingRouteViewsHeader),
      para(
        'The most common case. When rendering route content, key by ',
        inlineCode('model.route._tag'),
        ' so navigating between routes replaces the DOM rather than patching it:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.keyingRouteViewsHighlighted)],
          [],
        ),
        Snippets.keyingRouteViewsRaw,
        'Copy route views keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(keyingLayoutBranchesHeader),
      para(
        'When the app switches between entirely different layouts \u2014 a landing page vs. a docs layout with sidebar vs. a dashboard \u2014 key the outermost container of each branch with a stable string:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.keyingLayoutBranchesHighlighted),
          ],
          [],
        ),
        Snippets.keyingLayoutBranchesRaw,
        'Copy layout branches keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Without this, navigating from a full-width landing page to a sidebar docs layout would cause Snabbdom to try to morph one into the other \u2014 reusing DOM nodes across completely different structures.',
      ),
      tableOfContentsEntryToHeader(keyingModelStateHeader),
      para(
        'When the model itself is a discriminated union with structurally different views per variant, key on ',
        inlineCode('model._tag'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.keyingModelStateHighlighted)],
          [],
        ),
        Snippets.keyingModelStateRaw,
        'Copy model state keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This ensures that logging in fully tears down the login form and builds the dashboard from scratch, rather than patching one into the other.',
      ),
    ],
  )
