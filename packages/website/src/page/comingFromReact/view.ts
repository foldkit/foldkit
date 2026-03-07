import { Option, Record } from 'effect'
import { Ui } from 'foldkit'
import { Html } from 'foldkit/html'

import {
  Class,
  InnerHTML,
  div,
  li,
  p,
  span,
  strong,
  ul,
} from '../../html'
import { Icon } from '../../icon'
import { Link } from '../../link'
import type {
  Model as MainModel,
  Message as ParentMessage,
  TableOfContentsEntry,
} from '../../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  coreCounterExampleRouter,
  gettingStartedRouter,
  patternsSubmodelsRouter,
  routingAndNavigationRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { highlightedCodeBlock } from '../../view/codeBlock'
import { comparisonTable } from '../../view/table'
import { FAQ_IDS } from './faq'
import { GotFaqDisclosureMessage, type Message } from './message'
import type { Model } from './model'

const [
  faqReusableComponents,
  faqMultipleInstances,
  faqRouting,
  faqForms,
  faqWhereToStart,
] = FAQ_IDS

const introductionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'introduction',
  text: 'Introduction',
}

const mentalModelShiftsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'mental-model-shifts',
  text: 'Mental Model Shifts',
}

const codeComparisonHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'code-comparison',
  text: 'Side-by-Side Code Comparison',
}

const patternMappingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'pattern-mapping',
  text: 'Pattern Mapping',
}

const whatYoullMissHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-youll-miss',
  text: "What You'll Miss",
}

const whatYoullGainHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-youll-gain',
  text: "What You'll Gain",
}

const faqHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'faq',
  text: 'FAQ',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  introductionHeader,
  mentalModelShiftsHeader,
  codeComparisonHeader,
  patternMappingHeader,
  whatYoullMissHeader,
  whatYoullGainHeader,
  faqHeader,
]

const patternMappingTable = (): Html =>
  comparisonTable(
    ['React Ecosystem', 'Foldkit'],
    [
      [[inlineCode('useState')], ['Model (single state tree)']],
      [
        [inlineCode('useReducer')],
        [inlineCode('update'), ' function'],
      ],
      [
        [inlineCode('useEffect')],
        ['Commands (returned from ', inlineCode('update'), ')'],
      ],
      [
        [inlineCode('useContext'), ' / Redux / Zustand'],
        ['Single Model (no prop drilling)'],
      ],
      [
        [inlineCode('useMemo'), ' / ', inlineCode('useCallback')],
        ['Not needed (no stale closures)'],
      ],
      [['Custom hooks'], ['Domain modules with pure functions']],
      [['JSX'], ['Typed HTML helper functions']],
      [['Component props'], ['Function parameters']],
      [['Component state'], ['Part of the single Model']],
      [
        ['Event handlers'],
        ['Messages dispatched to ', inlineCode('update')],
      ],
      [
        ['React Router / TanStack Router'],
        ['Built-in typed routing'],
      ],
      [
        ['React Hook Form / Formik'],
        ['Model + Messages + Effect Schema validation'],
      ],
      [
        ['TanStack Query / SWR'],
        ['Commands + Subscriptions + typed async state'],
      ],
      [['WebSocket libraries / real-time'], ['Subscriptions']],
      [
        ['Error boundaries'],
        ['Typed errors in Effects + ', inlineCode('errorView')],
      ],
    ],
  )

const chevron = (isOpen: boolean) =>
  span(
    [
      Class(
        `text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const faqButtonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none'

const faqPanelClassName =
  'px-4 py-3 border-x border-b border-gray-300 dark:border-gray-700 rounded-b-lg text-gray-800 dark:text-gray-200 [&_p]:mb-2 [&_p]:last:mb-0 [&_p]:leading-normal'

const faqItem = (
  id: string,
  question: string,
  answerContent: ReadonlyArray<Html>,
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  Option.match(Record.get(model, id), {
    onSome: disclosure =>
      Ui.Disclosure.view({
        model: disclosure,
        toMessage: message =>
          toMessage(GotFaqDisclosureMessage({ id, message })),
        buttonClassName: faqButtonClassName,
        buttonContent: div(
          [Class('flex items-center justify-between w-full')],
          [span([], [question]), chevron(disclosure.isOpen)],
        ),
        panelClassName: faqPanelClassName,
        panelContent: div([], answerContent),
        className: 'mb-2',
      }),
    onNone: () =>
      div(
        [],
        [p([Class('font-bold')], [question]), ...answerContent],
      ),
  })

export const view = (
  mainModel: MainModel,
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('coming-from-react', 'Coming from React'),
      tableOfContentsEntryToHeader(introductionHeader),
      para(
        "If you're coming from React, you already understand component-based UI, state management, and the challenges of building complex web applications. Foldkit takes a different approach — one that may feel unfamiliar at first but addresses many frustrations you've likely encountered.",
      ),
      para(
        "This guide won't try to convince you that React is bad. React is a great tool that has shaped modern frontend development. But if you've ever struggled with stale closures, effect dependency arrays, or state scattered across components, Foldkit offers an alternative worth exploring.",
      ),
      tableOfContentsEntryToHeader(mentalModelShiftsHeader),
      para('The biggest shifts when moving from React to Foldkit:'),
      ul(
        [Class('list-disc mb-6 space-y-3')],
        [
          li(
            [],
            [
              strong([], ['Components → Functions']),
              ' — Instead of components with their own state and lifecycle, you have pure functions. The view is just a function from Model to HTML.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Local State → Single Model']),
              " — There's no useState scattered across components. All application state lives in one place, making it trivial to understand what your app knows at any moment.",
            ],
          ),
          li(
            [],
            [
              strong([], ['useEffect → Commands']),
              ' — Side effects are explicit return values from update, not callbacks triggered by dependency arrays. You never wonder "why did this effect run?"',
            ],
          ),
          li(
            [],
            [
              strong([], ['Hooks Rules → No Rules']),
              ' — No worrying about calling hooks in the wrong order, in conditionals, or in loops. There are no hooks — just functions.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Props Drilling → Direct Access']),
              " — With a single Model, any part of your view can access any state. You don't need Context or state management libraries to avoid prop drilling.",
            ],
          ),
        ],
      ),
      callout(
        'If you know Redux...',
        'The Model-View-Update pattern will feel familiar. Think of the Model as your Redux store, Messages as actions, and update as your reducer — but without the boilerplate of action creators, selectors, and middleware.',
      ),
      tableOfContentsEntryToHeader(codeComparisonHeader),
      para(
        "Let's compare a counter in React and Foldkit. The React version uses hooks:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.reactCounterHighlighted),
          ],
          [],
        ),
        Snippets.reactCounterRaw,
        'Copy React counter',
        mainModel,
        'mb-4',
      ),
      para(
        'The Foldkit version separates state, events, how events update state, and view:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.foldkitCounterHighlighted),
          ],
          [],
        ),
        Snippets.foldkitCounterRaw,
        'Copy Foldkit counter',
        mainModel,
        'mb-6',
      ),
      para(
        "Foldkit is more lines of code. It doesn't optimize for fewer characters or clever shortcuts — it optimizes for honesty. Every state is named, every event is typed, every transition is visible. At small scale that feels like overhead. At large scale it's the reason you can still understand your app.",
      ),
      para(
        "Here's a data fetching example. React requires careful handling of loading states, race conditions, and cleanup:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.reactDataFetchingHighlighted),
          ],
          [],
        ),
        Snippets.reactDataFetchingRaw,
        'Copy React data fetching',
        mainModel,
        'mb-4',
      ),
      para(
        'In Foldkit, the same pattern is explicit, auditable, and safe by default:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.foldkitDataFetchingHighlighted),
          ],
          [],
        ),
        Snippets.foldkitDataFetchingRaw,
        'Copy Foldkit data fetching',
        mainModel,
        'mb-6',
      ),
      para(
        "Notice there's no cleanup function, no cancelled flag, no stale closure risk. The Command runs, and when it completes, it returns a Message. The architecture eliminates the need for defensive coding.",
      ),
      para(
        'Now read the update function. Every state transition in the app is right there — when the user clicks fetch, set loading and fire the command. When the fetch succeeds, store the data. When it fails, store the error. Want to know what your app does? Read update. In React, the same understanding requires tracing through hooks, effects, and closures across multiple components.',
      ),
      tableOfContentsEntryToHeader(patternMappingHeader),
      para("Here's how common React patterns map to Foldkit:"),
      patternMappingTable(),
      tableOfContentsEntryToHeader(whatYoullMissHeader),
      para(
        "Let's be honest about the tradeoffs. Coming from React, you may miss:",
      ),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              strong([], ['Component encapsulation']),
              ' — In React, components encapsulate state and behavior. In Foldkit, state is centralized. This is a feature, not a bug, but it requires a different way of thinking about code organization.',
            ],
          ),
          li(
            [],
            [
              strong([], ['The React ecosystem']),
              " — React has thousands of component libraries, UI kits, and integrations. Foldkit is much smaller. You'll often write more from scratch.",
            ],
          ),
          li(
            [],
            [
              strong([], ['JSX']),
              " — Many developers prefer JSX's HTML-like syntax. Foldkit uses function calls that some find more verbose. Others prefer the consistency — it's just functions all the way down.",
            ],
          ),
          li(
            [],
            [
              strong([], ['Gradual adoption']),
              " — You can add React to any page incrementally. Foldkit works best as a full-page application. It's harder to embed a Foldkit widget in an existing React app.",
            ],
          ),
          li(
            [],
            [
              strong([], ['Familiarity']),
              " — Most frontend developers know React. Foldkit's patterns, while not difficult, require learning. Team onboarding takes longer.",
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(whatYoullGainHeader),
      para("In return, you'll gain:"),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              strong([], ['No stale closures']),
              " — Ever. The update function always receives the current model. There's no dependency array to get wrong.",
            ],
          ),
          li(
            [],
            [
              strong([], ['Explicit effects']),
              ' — Every side effect is a return value from update. You can see exactly what effects a message triggers by reading the code.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Testable by default']),
              ' — Your update function is pure. Give it a model and message, check the output. No mocking useState or useEffect.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Type-safe everything']),
              ' — Model, Messages, Commands — all typed. Effect Schema validates at runtime too. Fewer "undefined is not a function" errors.',
            ],
          ),
          li(
            [],
            [
              strong([], ['No hook rules']),
              ' — Call any function anywhere. No "rules of hooks" to remember, no linter errors about missing dependencies.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Single source of truth']),
              " — Want to know your app's state? It's all in the Model. Want to know what can happen? Look at Messages. Want to know how state changes? Read update.",
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(faqHeader),
      faqItem(
        faqReusableComponents,
        'How do I make reusable "components"?',
        [
          para(
            "Create functions that take parts of your Model and return Html. They're not components in the React sense — they don't have their own state — but they're reusable view logic. For complex features, you can use the submodel pattern to organize related state and logic together.",
          ),
        ],
        model,
        toMessage,
      ),
      faqItem(
        faqMultipleInstances,
        'How do I create multiple components with their own state?',
        [
          para(
            'There are no components in Foldkit. State always lives in your Model, and views are just functions from Model to Html. Say you need multiple accordions with independent state — you model that explicitly:',
          ),
          highlightedCodeBlock(
            div(
              [
                Class('text-sm'),
                InnerHTML(Snippets.multipleInstancesHighlighted),
              ],
              [],
            ),
            Snippets.multipleInstancesRaw,
            'Copy Model example',
            mainModel,
            'mb-4',
          ),
          para(
            'Here ',
            inlineCode('Accordion.Model'),
            ' is a submodel — a self-contained piece of state defined in its own module, with its own Message types, update function, and view. This is similar to what experienced React devs often end up doing anyway — lifting state out of components into a parent. Foldkit just enforces this pattern from the start. See the ',
            link(Link.exampleShoppingCart, 'Shopping Cart example'),
            ' for a concrete example, or ',
            link(patternsSubmodelsRouter(), 'Scaling with Submodels'),
            ' for the full pattern.',
          ),
        ],
        model,
        toMessage,
      ),
      faqItem(
        faqRouting,
        'How does routing work?',
        [
          para(
            'Foldkit has built-in typed routing. See the ',
            link(
              routingAndNavigationRouter(),
              'Routing & Navigation',
            ),
            ' page for details.',
          ),
        ],
        model,
        toMessage,
      ),
      faqItem(
        faqForms,
        'What about forms?',
        [
          para(
            'Forms work like everything else: form state lives in your Model, input dispatches Messages, and update handles validation. Check the ',
            link(Link.exampleForm, 'form example'),
            ' for patterns.',
          ),
        ],
        model,
        toMessage,
      ),
      faqItem(
        faqWhereToStart,
        "I'm sold. Where do I start?",
        [
          para(
            'Head to ',
            link(gettingStartedRouter(), 'Getting Started'),
            ' to create your first Foldkit app. Then read ',
            link(coreCounterExampleRouter(), 'Counter Example'),
            ' to understand the pieces in depth.',
          ),
        ],
        model,
        toMessage,
      ),
    ],
  )
