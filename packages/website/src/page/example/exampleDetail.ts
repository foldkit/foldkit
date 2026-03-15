import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import {
  AriaLabel,
  Class,
  Href,
  InnerHTML,
  Src,
  a,
  div,
  empty,
  iframe,
  keyed,
  span,
} from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage, TableOfContentsEntry } from '../../main'
import { pageTitle, para } from '../../prose'
import { examplesRouter } from '../../route'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import { type ExampleMeta, findBySlug } from './meta'
import type { ExampleSourceFile, ExampleSources } from './sources'

// MODEL

export const Model = S.Struct({
  sourceFileTabs: Ui.Tabs.Model,
  maybeExampleUrl: S.OptionFromSelf(S.String),
  livePreviewDisclosure: Ui.Disclosure.Model,
})
export type Model = typeof Model.Type

// MESSAGE

const GotSourceFileTabsMessage = m('GotSourceFileTabsMessage', {
  message: Ui.Tabs.Message,
})
export const ChangedExampleUrl = m('ChangedExampleUrl', { url: S.String })
const GotLivePreviewDisclosureMessage = m('GotLivePreviewDisclosureMessage', {
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(
  GotSourceFileTabsMessage,
  ChangedExampleUrl,
  GotLivePreviewDisclosureMessage,
)
export type Message = typeof Message.Type

// INIT

export const init = (): [Model, ReadonlyArray<Command<Message>>] => [
  {
    sourceFileTabs: Ui.Tabs.init({ id: 'source-file-tabs' }),
    maybeExampleUrl: Option.none(),
    livePreviewDisclosure: Ui.Disclosure.init({
      id: 'live-preview',
      isOpen: true,
    }),
  },
  [],
]

// UPDATE

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      GotSourceFileTabsMessage: ({ message }) => {
        const [nextTabs, tabsCommands] = Ui.Tabs.update(
          model.sourceFileTabs,
          message,
        )
        return [
          evo(model, { sourceFileTabs: () => nextTabs }),
          tabsCommands.map(
            Effect.map(message => GotSourceFileTabsMessage({ message })),
          ),
        ]
      },
      ChangedExampleUrl: ({ url }) => [
        evo(model, { maybeExampleUrl: () => Option.some(url) }),
        [],
      ],
      GotLivePreviewDisclosureMessage: ({ message }) => {
        const [nextDisclosure, disclosureCommands] = Ui.Disclosure.update(
          model.livePreviewDisclosure,
          message,
        )
        return [
          evo(model, { livePreviewDisclosure: () => nextDisclosure }),
          disclosureCommands.map(
            Effect.map(message => GotLivePreviewDisclosureMessage({ message })),
          ),
        ]
      },
    }),
  )

// VIEW

const featureTag = (text: string): Html =>
  div(
    [
      Class(
        'text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      ),
    ],
    [text],
  )

const headerView = (meta: ExampleMeta): Html =>
  div(
    [Class('mb-6')],
    [
      a(
        [
          Href(examplesRouter()),
          Class(
            'inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4',
          ),
        ],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
      pageTitle('example-detail', meta.title),
      para(meta.description),
      div(
        [Class('flex flex-wrap items-center gap-2 mt-3')],
        Array.map(meta.tags, featureTag),
      ),
      a(
        [
          Href(meta.sourceHref),
          Class(
            'text-sm text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 mt-3 inline-block',
          ),
        ],
        ['View source on GitHub'],
      ),
    ],
  )

const urlBarContent = (
  meta: ExampleMeta,
  maybeExampleUrl: Option.Option<string>,
): string =>
  meta.hasRouting ? Option.getOrElse(maybeExampleUrl, () => '/') : '/'

const trafficLightDots: Html = div(
  [Class('flex gap-1.5')],
  [
    div([Class('w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/60')], []),
    div(
      [Class('w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/60')],
      [],
    ),
    div([Class('w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/60')], []),
  ],
)

const DISCLOSURE_BUTTON_CLASS =
  'w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium cursor-pointer transition border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-xl data-[open]:rounded-b-none select-none'

const DISCLOSURE_PANEL_CLASS =
  'rounded-b-xl overflow-hidden border-x border-b border-gray-200 dark:border-gray-700/50 shadow-sm'

const disclosureChevron = (isOpen: boolean): Html =>
  span(
    [
      Class(
        `transition-transform text-gray-400 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const livePreviewDisclosureView = (
  disclosureModel: Ui.Disclosure.Model,
  meta: ExampleMeta,
  slug: string,
  maybeExampleUrl: Option.Option<string>,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  Ui.Disclosure.view({
    model: disclosureModel,
    toMessage: message =>
      toMessage(GotLivePreviewDisclosureMessage({ message })),
    buttonAttributes: [Class(DISCLOSURE_BUTTON_CLASS)],
    buttonContent: div(
      [Class('flex items-center justify-between w-full')],
      [span([], ['Live Preview']), disclosureChevron(disclosureModel.isOpen)],
    ),
    panelAttributes: [Class(DISCLOSURE_PANEL_CLASS)],
    panelContent: div(
      [],
      [
        div(
          [
            Class(
              'flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/50',
            ),
          ],
          [
            trafficLightDots,
            div(
              [
                Class(
                  'flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded px-3 py-1 text-center truncate',
                ),
              ],
              [urlBarContent(meta, maybeExampleUrl)],
            ),
          ],
        ),
        iframe(
          [
            Src(`/example-apps-embed/${slug}/index.html?embedded`),
            Class('w-full bg-white h-[40rem]'),
            AriaLabel(`${meta.title} example running live`),
          ],
          [],
        ),
      ],
    ),
    persistPanel: true,
  })

const TAB_BUTTON_BASE =
  'px-3 py-2 lg:py-1.5 whitespace-nowrap lg:whitespace-normal lg:w-full lg:text-left text-xs font-mono transition cursor-pointer'

const TAB_BUTTON_ACTIVE =
  TAB_BUTTON_BASE +
  ' bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium'

const TAB_BUTTON_INACTIVE =
  TAB_BUTTON_BASE +
  ' text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'

const sourceCodeView = (
  files: ReadonlyArray<ExampleSourceFile>,
  tabsModel: Ui.Tabs.Model,
  copiedSnippets: CopiedSnippets,
  isNarrowViewport: boolean,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const filePaths = Array.map(files, file => file.path)

  return Ui.Tabs.view({
    model: tabsModel,
    toMessage: message => toMessage(GotSourceFileTabsMessage({ message })),
    tabs: filePaths,
    tabToConfig: (filePath, { isActive }) => {
      const maybeFile = Array.findFirst(files, file => file.path === filePath)

      return {
        buttonClassName: isActive ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE,
        buttonContent: span([], [filePath.replaceAll('/', '/\u200B')]),
        panelClassName: 'code-embed-panel',
        panelContent: Option.match(maybeFile, {
          onNone: () => empty,
          onSome: file =>
            div(
              [Class('code-embed-scroll')],
              [
                highlightedCodeBlock(
                  div(
                    [Class('code-embed'), InnerHTML(file.highlightedHtml)],
                    [],
                  ),
                  file.rawCode,
                  `Copy ${file.path} to clipboard`,
                  copiedSnippets,
                  '!mt-0',
                ),
              ],
            ),
        }),
      }
    },
    orientation: isNarrowViewport ? 'Horizontal' : 'Vertical',
    attributes: [
      Class(
        'flex flex-col lg:flex-row overflow-hidden max-h-[80vh] border border-gray-200 dark:border-gray-700/50',
      ),
    ],
    tabListAriaLabel: 'Source files',
    tabListAttributes: [
      Class(
        'flex flex-shrink-0 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:w-44 lg:flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700/50 bg-gray-200 dark:bg-gray-800/50 divide-x lg:divide-x-0 lg:divide-y divide-gray-200 dark:divide-gray-700/50',
      ),
    ],
  })
}

export const view = (
  model: Model,
  slug: string,
  sources: ExampleSources,
  copiedSnippets: CopiedSnippets,
  isNarrowViewport: boolean,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  pipe(
    findBySlug(slug),
    Option.match({
      onNone: () => div([], ['Example not found']),
      onSome: meta =>
        keyed('div')(
          slug,
          [],
          [
            headerView(meta),
            livePreviewDisclosureView(
              model.livePreviewDisclosure,
              meta,
              slug,
              model.maybeExampleUrl,
              toMessage,
            ),
            div(
              [Class('mt-6')],
              [
                sourceCodeView(
                  sources.files,
                  model.sourceFileTabs,
                  copiedSnippets,
                  isNarrowViewport,
                  toMessage,
                ),
              ],
            ),
          ],
        ),
    }),
  )

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []
