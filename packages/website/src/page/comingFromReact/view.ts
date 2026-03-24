import { Option, Record } from 'effect'
import { Ui } from 'foldkit'
import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, p, span } from '../../html'
import { Icon } from '../../icon'
import { Link } from '../../link'
import type { Message as ParentMessage, TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  bestPracticesSideEffectsRouter,
  coreCounterExampleRouter,
  exampleDetailRouter,
  gettingStartedRouter,
  patternsSubmodelsRouter,
  routingAndNavigationRouter,
  uiOverviewRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import { comparisonTable } from '../../view/table'
import { FAQ_IDS } from './faq'
import { GotFaqDisclosureMessage, type Message } from './message'
import type { Model } from './model'

const [
  faqReusableComponents,
  faqMultipleInstances,
  faqRouting,
  faqForms,
  faqUiComponents,
  faqDataFetching,
  faqTesting,
  faqWhereToStart,
] = FAQ_IDS

const simpleCounterHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'a-simple-counter',
  text: 'A Simple Counter',
}

const autoCountHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'adding-auto-count',
  text: 'Adding Auto-Count',
}

const stepSizeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'adding-a-step-size',
  text: 'Adding a Step Size',
}

const translatingConceptsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'translating-react-concepts',
  text: 'Translating React Concepts',
}

const faqHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'faq',
  text: 'FAQ',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  simpleCounterHeader,
  autoCountHeader,
  stepSizeHeader,
  translatingConceptsHeader,
  faqHeader,
]

const patternMappingTable = (): Html =>
  comparisonTable(
    ['React Ecosystem', 'Foldkit'],
    [
      [[inlineCode('useState')], ['Model (single state tree)']],
      [[inlineCode('useReducer')], [inlineCode('update'), ' function']],
      [
        [inlineCode('useEffect'), ' (one-off)'],
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
      [['JSX'], ['Plain functions from Model to HTML']],
      [['Component props'], ['Function parameters']],
      [['Component state'], ['Part of the single Model']],
      [['Event handlers'], ['Messages dispatched to ', inlineCode('update')]],
      [['React Router / TanStack Router'], ['Built-in typed routing']],
      [
        ['React Hook Form / Formik'],
        ['Model + Messages + ', inlineCode('foldkit/fieldValidation')],
      ],
      [
        ['Event streams (useEffect / RxJS)'],
        ['Subscriptions (automatic lifecycle)'],
      ],
      [['Headless UI / Radix UI'], ['Foldkit UI (headless, typed components)']],
      [
        ['Error boundaries'],
        ['Typed errors in Effects + ', inlineCode('crash.view')],
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
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  Option.match(Record.get(model, id), {
    onSome: disclosure =>
      Ui.Disclosure.view({
        model: disclosure,
        toParentMessage: message =>
          toParentMessage(GotFaqDisclosureMessage({ id, message })),
        buttonAttributes: [Class(faqButtonClassName)],
        buttonContent: div(
          [Class('flex items-center justify-between w-full')],
          [span([], [question]), chevron(disclosure.isOpen)],
        ),
        panelAttributes: [Class(faqPanelClassName)],
        panelContent: div([], answerContent),
        attributes: [Class('mb-2')],
      }),
    onNone: () =>
      div([], [p([Class('font-bold')], [question]), ...answerContent]),
  })

export const view = (
  copiedSnippets: CopiedSnippets,
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('coming-from-react', 'Coming from React'),
      para(
        'If you know React, you already have the instincts for building UIs. Foldkit channels those instincts through a different structure \u2014 one where every state change, every side effect, and every event is explicit and visible. The best way to feel the difference is to build the same thing in both.',
      ),
      tableOfContentsEntryToHeader(simpleCounterHeader),
      para('A counter in React:'),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.reactCounterHighlighted)],
          [],
        ),
        Snippets.reactCounterRaw,
        'Copy React counter',
        copiedSnippets,
        'mb-4',
      ),
      para('The same counter in Foldkit:'),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.foldkitCounterHighlighted)],
          [],
        ),
        Snippets.foldkitCounterRaw,
        'Copy Foldkit counter',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'More lines, same result. At this scale, Foldkit\u2019s structure \u2014 Model, Message, update, view \u2014 looks like overhead. The benefits come with scale. Every piece earns its place as more complex behavior is introduced.',
      ),
      tableOfContentsEntryToHeader(autoCountHeader),
      para(
        'New requirement: a play/pause button that auto-increments the counter every second.',
      ),
      para(
        'React adds a ref to hold the interval ID and a ',
        inlineCode('useEffect'),
        ' to start and stop the interval:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.reactCounterResetHighlighted)],
          [],
        ),
        Snippets.reactCounterResetRaw,
        'Copy React counter with auto-play',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The interval state lives outside React\u2019s state system \u2014 in a ref \u2014 because the effect needs to clear the previous interval before starting a new one. The cleanup function is critical: miss it and you leak intervals.',
      ),
      para('Foldkit adds a Subscription and a Message:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.foldkitCounterResetHighlighted),
          ],
          [],
        ),
        Snippets.foldkitCounterResetRaw,
        'Copy Foldkit counter with auto-play',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'The Subscription emits ',
        inlineCode('Ticked'),
        ' every second while ',
        inlineCode('isAutoCounting'),
        ' is true. Foldkit manages the stream lifecycle \u2014 starts it when the dependency changes to true, tears it down when it changes to false. No refs, no manual cleanup.',
      ),
      tableOfContentsEntryToHeader(stepSizeHeader),
      para(
        'One more feature: an input that controls how much each tick and manual click increments by.',
      ),
      para(
        'This is where the React version hits a wall. The ',
        inlineCode('setInterval'),
        ' callback captures ',
        inlineCode('step'),
        ' at creation time. If you change the step while playing, the interval keeps using the old value \u2014 a stale closure. The fix: a ref and a sync effect to keep it current:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.reactCounterAutoPlayHighlighted),
          ],
          [],
        ),
        Snippets.reactCounterAutoPlayRaw,
        'Copy React counter with step size',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Two refs, two effects, and a subtle bug that only manifests at runtime \u2014 the interval silently uses a stale value until you add the ref workaround. Most React developers have been burned by this.',
      ),
      para('In Foldkit, there is no stale closure:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.foldkitCounterAutoPlayHighlighted),
          ],
          [],
        ),
        Snippets.foldkitCounterAutoPlayRaw,
        'Copy Foldkit counter with step size',
        copiedSnippets,
        'mb-6',
      ),
      para(
        inlineCode('model.step'),
        ' is always current. The update function receives the latest Model every time a Message arrives. Both ',
        inlineCode('ClickedIncrement'),
        ' and ',
        inlineCode('Ticked'),
        ' use ',
        inlineCode('model.step'),
        ' and it just works \u2014 no refs, no sync effects, no runtime surprises.',
      ),
      para(
        'Read the update function top to bottom. Every behavior in the app is right there. Each case is independent \u2014 they don\u2019t interact through shared mutable state or overlapping effect dependencies. Adding a feature meant adding cases, not restructuring existing ones.',
      ),
      infoCallout(
        'The pattern',
        'In React, complexity compounds. Each feature interacts with existing effects, refs, and closures. In Foldkit, complexity scales linearly. Each feature adds Messages, update cases, and possibly Commands or Subscriptions \u2014 but they don\u2019t interact with each other through shared mutable state.',
      ),
      para(
        'This structure also makes testing trivial. Your update function is pure \u2014 pass a Model and a Message, assert on the returned Model. No rendering, no mocking ',
        inlineCode('useEffect'),
        ', no wrapping in providers.',
      ),
      para(
        'This is a toy example. Consider what happens at real scale \u2014 a multiplayer game with WebSocket streams, a mix of client and server state, handling keyboard events, animations, and reconnection logic. In React, every feature adds effects that interact with every other effect. In Foldkit, the architecture is the same as the counter: Messages come in, the update function decides what to do, Commands and Subscriptions handle the rest. The complexity of your domain grows, but the complexity of your architecture doesn\u2019t.',
      ),
      tableOfContentsEntryToHeader(translatingConceptsHeader),
      para('Here\u2019s how React patterns map to Foldkit:'),
      patternMappingTable(),
      infoCallout(
        'If you know Redux...',
        'The Model-View-Update pattern will feel familiar. Think of the Model as your Redux store, Messages as actions, and update as your reducer \u2014 but without action creators, selectors, or middleware.',
      ),
      tableOfContentsEntryToHeader(faqHeader),
      faqItem(
        faqReusableComponents,
        'How do I make reusable \u201Ccomponents\u201D?',
        [
          para(
            'Create functions that take parts of your Model and return Html. They\u2019re not components in the React sense \u2014 they don\u2019t have their own state or lifecycle \u2014 but they\u2019re reusable view logic. For complex features that need their own state, use the ',
            link(patternsSubmodelsRouter(), 'Submodels'),
            ' pattern: the child module gets its own Model, Message, and update, and the parent embeds and delegates to it.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqMultipleInstances,
        'How do I create multiple components with their own state?',
        [
          para(
            'State always lives in your Model, and views are functions from Model to Html. For multiple instances with independent state, model each one explicitly:',
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
            copiedSnippets,
            'mb-4',
          ),
          para(
            'Each ',
            inlineCode('Accordion.Model'),
            ' is a Submodel \u2014 a self-contained piece of state with its own Messages, update, and view. This is similar to what React developers end up doing anyway \u2014 lifting state into a parent \u2014 but Foldkit enforces it from the start. See the ',
            link(
              exampleDetailRouter({ exampleSlug: 'shopping-cart' }),
              'Shopping Cart example',
            ),
            ' for a concrete implementation.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqRouting,
        'How does routing work?',
        [
          para(
            'Foldkit has built-in typed routing with bidirectional parsers \u2014 define routes once, use them for both URL parsing and URL building. See ',
            link(routingAndNavigationRouter(), 'Routing & Navigation'),
            '.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqForms,
        'What about forms?',
        [
          para(
            'Form state lives in your Model, inputs dispatch Messages, and update handles validation. Foldkit ships a field validation module with four-state fields (',
            inlineCode('NotValidated'),
            ', ',
            inlineCode('Validating'),
            ', ',
            inlineCode('Valid'),
            ', ',
            inlineCode('Invalid'),
            '), and ',
            link(uiOverviewRouter(), 'Foldkit UI'),
            ' provides headless components like Combobox and Listbox for richer form controls. See the ',
            link(exampleDetailRouter({ exampleSlug: 'form' }), 'Form example'),
            '.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqUiComponents,
        'What about Headless UI, Radix, or Shadcn?',
        [
          para(
            link(uiOverviewRouter(), 'Foldkit UI'),
            ' is a built-in set of headless, accessible components \u2014 Disclosure, Combobox, Listbox, Menu, Popover, and more. Each one follows The Elm Architecture with its own Model, Message, and update, and integrates into your app via the Submodels pattern. You provide the markup and styling; Foldkit UI provides the accessibility attributes, keyboard navigation, and state management.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqDataFetching,
        'How do I fetch data?',
        [
          para(
            'Return a Command from your update function. The runtime runs the Command \u2014 an HTTP request, a localStorage read, a DOM focus call, whatever side effect you need \u2014 and feeds the resulting Message back into update. No ',
            inlineCode('useEffect'),
            ', no cleanup functions, no race conditions. See the ',
            link(Link.exampleWeatherFetch, 'Weather example'),
            ' for a complete implementation.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqTesting,
        'How do I test my app?',
        [
          para(
            'Your update function is pure \u2014 give it a Model and a Message, check the returned Model and Commands. Commands carry names, so you can assert which ones were produced: ',
            inlineCode("expect(commands[0].name).toBe('FetchWeather')"),
            '. No rendering, no mocking hooks, no test utilities. Commands are Effects with explicit dependencies, so you can swap in test layers without stubbing globals. See ',
            link(
              `${bestPracticesSideEffectsRouter()}#testing-update`,
              'Best Practices',
            ),
            ' for a complete testing example.',
          ),
        ],
        model,
        toParentMessage,
      ),
      faqItem(
        faqWhereToStart,
        'I\u2019m sold. Where do I start?',
        [
          para(
            'Head to ',
            link(gettingStartedRouter(), 'Getting Started'),
            ' to create your first Foldkit app, then read the ',
            link(coreCounterExampleRouter(), 'Counter Example'),
            ' to understand each piece in depth.',
          ),
        ],
        model,
        toParentMessage,
      ),
    ],
  )
