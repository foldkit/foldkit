import { Array } from 'effect'
import { Html } from 'foldkit/html'

import {
  AriaHidden,
  Class,
  DataAttribute,
  InnerHTML,
  div,
  keyed,
  p,
  span,
} from '../html'

export const sectionLabel = (label: string): Html =>
  p(
    [
      Class(
        'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
      ),
    ],
    [label],
  )

export const modelStateField = (name: string, value: string): Html =>
  div(
    [],
    [
      span([Class('text-accent-600 dark:text-accent-400')], [name]),
      span([Class('text-gray-400 dark:text-gray-500')], [': ']),
      span([Class('text-amber-600 dark:text-amber-300')], [value]),
    ],
  )

export const modelStateView = (fields: ReadonlyArray<Html>): Html =>
  div(
    [Class('pt-3 border-t border-gray-300 dark:border-gray-800')],
    [
      sectionLabel('Model State'),
      div(
        [
          Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 text-gray-700 dark:text-gray-300 leading-relaxed',
          ),
        ],
        fields,
      ),
    ],
  )

export const eventLogView = (
  messageLog: ReadonlyArray<string>,
): Html =>
  div(
    [Class('flex-1 flex flex-col min-h-0')],
    [
      sectionLabel('Message Log'),
      div(
        [
          Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto',
          ),
        ],
        Array.map(messageLog, (entry, index) =>
          keyed('div')(
            `${entry}-${index}`,
            [
              Class(
                'py-0.5 text-emerald-600 dark:text-emerald-400 break-all',
              ),
            ],
            [span([], [entry])],
          ),
        ),
      ),
    ],
  )

export const phaseIndicatorView = (
  label: string,
  colorClass: string,
  extraChildren: ReadonlyArray<Html>,
): Html =>
  div(
    [],
    [
      sectionLabel('Phase'),
      div(
        [
          Class(
            'flex items-center gap-2 text-xs font-semibold uppercase tracking-wider',
          ),
        ],
        [
          div(
            [Class('w-2 h-2 rounded-full bg-current ' + colorClass)],
            [],
          ),
          span([Class(colorClass)], [label]),
          ...extraChildren,
        ],
      ),
    ],
  )

export const codePanelView = (
  panelClassName: string,
  dataAttributeName: string,
  phase: string,
  html: string,
): Html =>
  div(
    [
      Class(
        panelClassName +
          ' rounded-xl order-last lg:order-none bg-[#1c1a20] min-w-0',
      ),
      DataAttribute(dataAttributeName, phase),
    ],
    [
      div(
        [Class('demo-code-scroll overflow-auto')],
        [div([InnerHTML(html)], [])],
      ),
    ],
  )

export const demoViewShell = (
  codePanel: Html,
  appPanel: Html,
): Html =>
  div(
    [
      Class(
        'demo-container grid grid-cols-1 lg:grid-cols-[1fr_22rem] lg:grid-rows-[minmax(0,1fr)] gap-4 lg:gap-6',
      ),
    ],
    [
      p(
        [
          Class(
            'text-sm text-gray-500 dark:text-gray-500 text-center text-balance lg:hidden',
          ),
          AriaHidden(true),
        ],
        [
          'On a larger screen, you can see the relevant code highlight in real time as your action runs.',
        ],
      ),
      codePanel,
      appPanel,
    ],
  )
