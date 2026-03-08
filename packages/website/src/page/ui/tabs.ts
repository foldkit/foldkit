import { Match as M } from 'effect'
import { Ui } from 'foldkit'

import { Class, div, p, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import {
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const tabsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'tabs',
  text: 'Tabs',
}

export const horizontalHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'horizontal',
  text: 'Horizontal',
}

export const verticalHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'vertical',
  text: 'Vertical',
}

// DEMO CONTENT

type DemoTab = 'Foldkit' | 'React' | 'Elm'

const demoTabs: ReadonlyArray<DemoTab> = ['Foldkit', 'React', 'Elm']

const buttonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-t-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 mb-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-b-0'

const panelClassName =
  'p-6 bg-cream dark:bg-gray-900 rounded-b-lg rounded-tr-lg border border-gray-200 dark:border-gray-700'

const foldkitPanel = div(
  [],
  [
    p(
      [Class('text-gray-700 dark:text-gray-300 mb-3')],
      [
        span([Class('text-gray-900 dark:text-white')], ['Model-View-Update']),
        ' with Effect. A single immutable model holds all state, messages describe what happened, and a pure update function produces the next state. Side effects are explicit commands — never hidden in the view layer.',
      ],
    ),
    p(
      [Class('text-gray-500 dark:text-gray-400 text-sm')],
      [
        'Composable "The Elm Architecture" modules, Schema-typed state, and controlled side effects via Effect.',
      ],
    ),
  ],
)

const reactPanel = div(
  [],
  [
    p(
      [Class('text-gray-700 dark:text-gray-300 mb-3')],
      [
        span([Class('text-gray-900 dark:text-white')], ['Component-based']),
        ' with hooks for state and effects. Each component manages its own local state via useState and useReducer, with useEffect for side effects. State flows down through props, and changes propagate back up through callbacks.',
      ],
    ),
    p(
      [Class('text-gray-500 dark:text-gray-400 text-sm')],
      [
        'JSX views, hooks-driven state, and implicit side effects via useEffect.',
      ],
    ),
  ],
)

const elmPanel = div(
  [],
  [
    p(
      [Class('text-gray-700 dark:text-gray-300 mb-3')],
      [
        span(
          [Class('text-gray-900 dark:text-white')],
          ['The original Elm Architecture'],
        ),
        '. Elm pioneered the Model-View-Update architecture with a pure functional language that compiles to JavaScript. No runtime exceptions, a strict compiler, and managed effects through Cmd and Sub. Foldkit brings these ideas to TypeScript.',
      ],
    ),
    p(
      [Class('text-gray-500 dark:text-gray-400 text-sm')],
      [
        'Pure functional language, Cmd/Sub for effects, and compiler-guaranteed correctness.',
      ],
    ),
  ],
)

const verticalButtonClassName =
  'px-4 py-2 text-base font-normal text-left cursor-pointer transition rounded-l-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-r-0'

const verticalPanelClassName =
  'flex-1 p-6 bg-cream dark:bg-gray-900 rounded-r-lg rounded-bl-lg border border-gray-200 dark:border-gray-700'

const tabToConfig = (
  tab: DemoTab,
  _context: { isActive: boolean },
): Ui.Tabs.TabConfig => ({
  buttonClassName,
  buttonContent: span([], [tab]),
  panelClassName,
  panelContent: M.value(tab).pipe(
    M.when('Foldkit', () => foldkitPanel),
    M.when('React', () => reactPanel),
    M.when('Elm', () => elmPanel),
    M.exhaustive,
  ),
})

const verticalTabToConfig = (
  tab: DemoTab,
  _context: { isActive: boolean },
): Ui.Tabs.TabConfig => ({
  buttonClassName: verticalButtonClassName,
  buttonContent: span([], [tab]),
  panelClassName: verticalPanelClassName,
  panelContent: M.value(tab).pipe(
    M.when('Foldkit', () => foldkitPanel),
    M.when('React', () => reactPanel),
    M.when('Elm', () => elmPanel),
    M.exhaustive,
  ),
})

// VIEW

export const horizontalDemo = (
  tabsModel: Ui.Tabs.Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', horizontalHeader.id, horizontalHeader.text),
  Ui.Tabs.view({
    model: tabsModel,
    toMessage: message => toMessage(GotHorizontalTabsDemoMessage({ message })),
    tabs: demoTabs,
    tabToConfig,
    tabListClassName: 'flex',
  }),
]

export const verticalDemo = (
  tabsModel: Ui.Tabs.Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', verticalHeader.id, verticalHeader.text),
  Ui.Tabs.view({
    model: tabsModel,
    toMessage: message => toMessage(GotVerticalTabsDemoMessage({ message })),
    tabs: demoTabs,
    tabToConfig: verticalTabToConfig,
    orientation: 'Vertical',
    className: 'flex',
    tabListClassName: 'flex flex-col',
  }),
]
