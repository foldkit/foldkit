import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, h3, p, span } from '../html'
import type { Message as ParentMessage } from '../main'
import {
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

type DemoTab = 'Foldkit' | 'React' | 'Elm'

const demoTabs: ReadonlyArray<DemoTab> = ['Foldkit', 'React', 'Elm']

const horizontalButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-t-lg border border-gray-200 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 mb-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-white data-[selected]:text-gray-900 data-[selected]:border-b-0'

const horizontalPanelClassName =
  'p-6 bg-white rounded-b-lg rounded-tr-lg border border-gray-200'

const verticalButtonClassName =
  'px-4 py-2 text-base font-normal text-left cursor-pointer transition rounded-l-lg border border-gray-200 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-white data-[selected]:text-gray-900 data-[selected]:border-r-0'

const verticalPanelClassName =
  'flex-1 p-6 bg-white rounded-r-lg rounded-bl-lg border border-gray-200'

const foldkitPanel = div(
  [],
  [
    p(
      [Class('text-gray-700 mb-3')],
      [
        span([Class('text-gray-900')], ['Model-View-Update']),
        ' with Effect. A single immutable model holds all state, messages describe what happened, and a pure update function produces the next state.',
      ],
    ),
    p(
      [Class('text-gray-500 text-sm')],
      [
        'Composable Elm Architecture modules, Schema-typed state, and controlled side effects via Effect.',
      ],
    ),
  ],
)

const reactPanel = div(
  [],
  [
    p(
      [Class('text-gray-700 mb-3')],
      [
        span([Class('text-gray-900')], ['Component-based']),
        ' with hooks for state and effects. Each component manages its own local state via useState and useReducer.',
      ],
    ),
    p(
      [Class('text-gray-500 text-sm')],
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
      [Class('text-gray-700 mb-3')],
      [
        span([Class('text-gray-900')], ['The original Elm Architecture']),
        '. Elm pioneered the Model-View-Update architecture with a pure functional language. Foldkit brings these ideas to TypeScript.',
      ],
    ),
    p(
      [Class('text-gray-500 text-sm')],
      [
        'Pure functional language, Cmd/Sub for effects, and compiler-guaranteed correctness.',
      ],
    ),
  ],
)

const horizontalTabToConfig = (
  tab: DemoTab,
  _context: { isActive: boolean },
): Ui.Tabs.TabConfig => ({
  buttonClassName: horizontalButtonClassName,
  buttonContent: span([], [tab]),
  panelClassName: horizontalPanelClassName,
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

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Tabs']),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Horizontal'],
      ),
      Ui.Tabs.view({
        model: model.horizontalTabsDemo,
        toMessage: message =>
          toMessage(GotHorizontalTabsDemoMessage({ message })),
        tabs: demoTabs,
        tabToConfig: horizontalTabToConfig,
        tabListAttributes: [Class('flex')],
        tabListAriaLabel: 'Framework comparison tabs',
      }),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Vertical'],
      ),
      Ui.Tabs.view({
        model: model.verticalTabsDemo,
        toMessage: message =>
          toMessage(GotVerticalTabsDemoMessage({ message })),
        tabs: demoTabs,
        tabToConfig: verticalTabToConfig,
        orientation: 'Vertical',
        attributes: [Class('flex')],
        tabListAttributes: [Class('flex flex-col')],
        tabListAriaLabel: 'Framework comparison tabs',
      }),
    ],
  )
