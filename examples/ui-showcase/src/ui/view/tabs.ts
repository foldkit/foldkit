import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

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

const foldkitPanel = <ParentMessage>(): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.p(
        [h.Class('text-gray-700 mb-3')],
        [
          h.span([h.Class('text-gray-900')], ['Model-View-Update']),
          ' with Effect. A single immutable model holds all state, messages describe what happened, and a pure update function produces the next state.',
        ],
      ),
      h.p(
        [h.Class('text-gray-500 text-sm')],
        [
          'Composable Elm Architecture modules, Schema-typed state, and controlled side effects via Effect.',
        ],
      ),
    ],
  )
}

const reactPanel = <ParentMessage>(): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.p(
        [h.Class('text-gray-700 mb-3')],
        [
          h.span([h.Class('text-gray-900')], ['Component-based']),
          ' with hooks for state and effects. Each component manages its own local state via useState and useReducer.',
        ],
      ),
      h.p(
        [h.Class('text-gray-500 text-sm')],
        [
          'JSX views, hooks-driven state, and implicit side effects via useEffect.',
        ],
      ),
    ],
  )
}

const elmPanel = <ParentMessage>(): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.p(
        [h.Class('text-gray-700 mb-3')],
        [
          h.span([h.Class('text-gray-900')], ['The original Elm Architecture']),
          '. Elm pioneered the Model-View-Update architecture with a pure functional language. Foldkit brings these ideas to TypeScript.',
        ],
      ),
      h.p(
        [h.Class('text-gray-500 text-sm')],
        [
          'Pure functional language, Cmd/Sub for effects, and compiler-guaranteed correctness.',
        ],
      ),
    ],
  )
}

const horizontalTabToConfig = <ParentMessage>(
  tab: DemoTab,
  _context: { isActive: boolean },
): Ui.Tabs.TabConfig => {
  const h = html<ParentMessage>()

  return {
    buttonClassName: horizontalButtonClassName,
    buttonContent: h.span([], [tab]),
    panelClassName: horizontalPanelClassName,
    panelContent: M.value(tab).pipe(
      M.when('Foldkit', () => foldkitPanel<ParentMessage>()),
      M.when('React', () => reactPanel<ParentMessage>()),
      M.when('Elm', () => elmPanel<ParentMessage>()),
      M.exhaustive,
    ),
  }
}

const verticalTabToConfig = <ParentMessage>(
  tab: DemoTab,
  _context: { isActive: boolean },
): Ui.Tabs.TabConfig => {
  const h = html<ParentMessage>()

  return {
    buttonClassName: verticalButtonClassName,
    buttonContent: h.span([], [tab]),
    panelClassName: verticalPanelClassName,
    panelContent: M.value(tab).pipe(
      M.when('Foldkit', () => foldkitPanel<ParentMessage>()),
      M.when('React', () => reactPanel<ParentMessage>()),
      M.when('Elm', () => elmPanel<ParentMessage>()),
      M.exhaustive,
    ),
  }
}

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Tabs']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Horizontal'],
      ),
      Ui.Tabs.view({
        model: model.horizontalTabsDemo,
        toParentMessage: message =>
          toParentMessage(GotHorizontalTabsDemoMessage({ message })),
        tabs: demoTabs,
        tabToConfig: (tab, context) =>
          horizontalTabToConfig<ParentMessage>(tab, context),
        tabListAttributes: [h.Class('flex')],
        tabListAriaLabel: 'Framework comparison tabs',
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Vertical'],
      ),
      Ui.Tabs.view({
        model: model.verticalTabsDemo,
        toParentMessage: message =>
          toParentMessage(GotVerticalTabsDemoMessage({ message })),
        tabs: demoTabs,
        tabToConfig: (tab, context) =>
          verticalTabToConfig<ParentMessage>(tab, context),
        orientation: 'Vertical',
        attributes: [h.Class('flex')],
        tabListAttributes: [h.Class('flex flex-col')],
        tabListAriaLabel: 'Framework comparison tabs',
      }),
    ],
  )
}
