import { Html, html } from 'foldkit/html'

import type { Message } from '../message'

export const sectionLabel = (label: string): Html => {
  const h = html<Message>()

  return h.p(
    [
      h.Class(
        'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
      ),
    ],
    [label],
  )
}

export const modelStateField = (name: string, value: string): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.span([h.Class('text-accent-700 dark:text-accent-400')], [name]),
      h.span([h.Class('text-gray-400 dark:text-gray-500')], [': ']),
      h.span([h.Class('text-amber-800 dark:text-amber-300')], [value]),
    ],
  )
}

export const modelStateView = (fields: ReadonlyArray<Html>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('pt-3 border-t border-gray-300 dark:border-gray-800')],
    [
      sectionLabel('Model State'),
      h.div(
        [
          h.Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 text-gray-700 dark:text-gray-300 leading-relaxed',
          ),
        ],
        fields,
      ),
    ],
  )
}

const messageLogEntryView = (entry: string, index: number): Html => {
  const h = html<Message>()
  return h.keyed('div')(
    `${entry}-${index}`,
    [h.Class('py-0.5 text-emerald-600 dark:text-emerald-400 break-all')],
    [h.span([], [entry])],
  )
}

export const eventLogView = (messageLog: ReadonlyArray<string>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex-1 flex flex-col min-h-0')],
    [
      sectionLabel('Message Log'),
      h.div(
        [
          h.Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto',
          ),
        ],
        messageLog.map(messageLogEntryView),
      ),
    ],
  )
}

export const phaseIndicatorView = (
  label: string,
  colorClass: string,
  extraChildren: ReadonlyArray<Html>,
): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      sectionLabel('Phase'),
      h.div(
        [
          h.Class(
            'flex items-center gap-2 text-xs font-semibold uppercase tracking-wider',
          ),
        ],
        [
          h.div([h.Class('w-2 h-2 rounded-full bg-current ' + colorClass)], []),
          h.span([h.Class(colorClass)], [label]),
          ...extraChildren,
        ],
      ),
    ],
  )
}

export const codePanelView = (
  panelClassName: string,
  dataAttributeName: string,
  phase: string,
  htmlString: string,
): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        panelClassName +
          ' rounded-xl order-last lg:order-none bg-gray-100 dark:bg-[#1c1a20] min-w-0',
      ),
      h.DataAttribute(dataAttributeName, phase),
    ],
    [
      h.div(
        [h.Class('demo-code-scroll overflow-auto')],
        [h.div([h.InnerHTML(htmlString)], [])],
      ),
    ],
  )
}

export const demoViewShell = (codePanel: Html, appPanel: Html): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'demo-container grid grid-cols-1 lg:grid-cols-[1fr_22rem] lg:grid-rows-[minmax(0,1fr)] gap-4 lg:gap-6',
      ),
    ],
    [
      h.p(
        [
          h.Class(
            'text-sm text-gray-500 dark:text-gray-500 text-center text-balance lg:hidden',
          ),
          h.AriaHidden(true),
        ],
        [
          'On a larger screen, you can see the relevant code highlight in real time as your action runs.',
        ],
      ),
      codePanel,
      appPanel,
    ],
  )
}
