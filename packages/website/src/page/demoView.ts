import { type Html, inertHtml as ih } from 'foldkit/html'

export const sectionLabel = (label: string): Html =>
  ih.p(
    [
      ih.Class(
        'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
      ),
    ],
    [label],
  )

export const modelStateField = (name: string, value: string): Html =>
  ih.div(
    [],
    [
      ih.span([ih.Class('text-accent-700 dark:text-accent-400')], [name]),
      ih.span([ih.Class('text-gray-400 dark:text-gray-500')], [': ']),
      ih.span([ih.Class('text-amber-800 dark:text-amber-300')], [value]),
    ],
  )

export const modelState = (fields: ReadonlyArray<Html>): Html =>
  ih.div(
    [ih.Class('pt-3 border-t border-gray-200 dark:border-gray-800')],
    [
      sectionLabel('Model State'),
      ih.div(
        [
          ih.Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 text-gray-700 dark:text-gray-300 leading-relaxed',
          ),
        ],
        fields,
      ),
    ],
  )

const messageLogEntryView = (entry: string, index: number): Html =>
  ih.keyed('div')(
    `${entry}-${index}`,
    [ih.Class('py-0.5 text-emerald-600 dark:text-emerald-400 break-all')],
    [ih.span([], [entry])],
  )

export const eventLog = (messageLog: ReadonlyArray<string>): Html =>
  ih.div(
    [ih.Class('flex-1 flex flex-col min-h-0')],
    [
      sectionLabel('Message Log'),
      ih.div(
        [
          ih.Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto',
          ),
        ],
        messageLog.map(messageLogEntryView),
      ),
    ],
  )

export const phaseIndicator = (
  label: string,
  colorClass: string,
  extraChildren: ReadonlyArray<Html>,
): Html =>
  ih.div(
    [],
    [
      sectionLabel('Phase'),
      ih.div(
        [
          ih.Class(
            'flex items-center gap-2 text-xs font-semibold uppercase tracking-wider',
          ),
        ],
        [
          ih.div([ih.Class('w-2 h-2 rounded-full bg-current ' + colorClass)]),
          ih.span([ih.Class(colorClass)], [label]),
          ...extraChildren,
        ],
      ),
    ],
  )

export const codePanel = (
  panelClassName: string,
  dataAttributeName: string,
  phase: string,
  htmlString: string,
): Html =>
  ih.div(
    [
      ih.Class(
        panelClassName +
          ' code-surface rounded-xl order-last lg:order-none min-w-0',
      ),
      ih.DataAttribute(dataAttributeName, phase),
    ],
    [
      ih.div(
        [ih.Class('demo-code-scroll overflow-auto')],
        [ih.div([ih.InnerHTML(htmlString)])],
      ),
    ],
  )

export const shell = (codePanel: Html, appPanel: Html): Html =>
  ih.div(
    [
      ih.Class(
        'demo-container grid grid-cols-1 lg:grid-cols-[1fr_22rem] lg:grid-rows-[minmax(0,1fr)] gap-4 lg:gap-6',
      ),
    ],
    [
      ih.p(
        [
          ih.Class(
            'text-sm text-gray-500 dark:text-gray-500 text-center text-balance lg:hidden',
          ),
          ih.AriaHidden(true),
        ],
        [
          'On a larger screen, you can see the relevant code highlight in real time as your action runs.',
        ],
      ),
      codePanel,
      appPanel,
    ],
  )
