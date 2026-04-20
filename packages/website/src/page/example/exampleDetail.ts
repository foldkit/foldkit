import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
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
  h3,
  iframe,
  keyed,
  p,
  span,
} from '../../html'
import { Icon } from '../../icon'
import { exampleSourceHref } from '../../link'
import type { Message as ParentMessage, TableOfContentsEntry } from '../../main'
import { makeRemoteData } from '../../makeRemoteData'
import { pageTitle, para } from '../../prose'
import { examplesRouter, playgroundRouter } from '../../route'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import { type ExampleMeta, findBySlug } from './meta'
import {
  type ExampleSourceFile,
  ExampleSources,
  loadSourcesForSlug,
} from './sources'

// MODEL

export const CurrentSourcesRemoteData = makeRemoteData(S.String, ExampleSources)

export const Model = S.Struct({
  sourceFileTabs: Ui.Tabs.Model,
  maybeExampleUrl: S.OptionFromSelf(S.String),
  livePreviewDisclosure: Ui.Disclosure.Model,
  currentSources: CurrentSourcesRemoteData.Union,
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
export const StartedLoadExampleSources = m('StartedLoadExampleSources', {
  slug: S.String,
})
export const SucceededLoadExampleSources = m('SucceededLoadExampleSources', {
  sources: ExampleSources,
})
export const FailedLoadExampleSources = m('FailedLoadExampleSources', {
  error: S.String,
})

export const Message = S.Union(
  GotSourceFileTabsMessage,
  ChangedExampleUrl,
  GotLivePreviewDisclosureMessage,
  StartedLoadExampleSources,
  SucceededLoadExampleSources,
  FailedLoadExampleSources,
)
export type Message = typeof Message.Type

// COMMAND

export const LoadExampleSources = Command.define(
  'LoadExampleSources',
  SucceededLoadExampleSources,
  FailedLoadExampleSources,
)

const loadExampleSources = (slug: string) =>
  LoadExampleSources(
    Effect.tryPromise({
      try: () => loadSourcesForSlug(slug),
      catch: error =>
        error instanceof Error ? error.message : `Unknown example: ${slug}`,
    }).pipe(
      Effect.map(sources => SucceededLoadExampleSources({ sources })),
      Effect.catchAll(error =>
        Effect.succeed(FailedLoadExampleSources({ error })),
      ),
    ),
  )

// INIT

export const init = (): readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
] => [
  {
    sourceFileTabs: Ui.Tabs.init({ id: 'source-file-tabs' }),
    maybeExampleUrl: Option.none(),
    livePreviewDisclosure: Ui.Disclosure.init({
      id: 'live-preview',
      isOpen: true,
    }),
    currentSources: CurrentSourcesRemoteData.NotAsked(),
  },
  [],
]

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      GotSourceFileTabsMessage: ({ message }) => {
        const [nextTabs, tabsCommands] = Ui.Tabs.update(
          model.sourceFileTabs,
          message,
        )
        return [
          evo(model, { sourceFileTabs: () => nextTabs }),
          tabsCommands.map(
            Command.mapEffect(
              Effect.map(message => GotSourceFileTabsMessage({ message })),
            ),
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
            Command.mapEffect(
              Effect.map(message =>
                GotLivePreviewDisclosureMessage({ message }),
              ),
            ),
          ),
        ]
      },

      StartedLoadExampleSources: ({ slug }) => [
        evo(model, {
          sourceFileTabs: () => Ui.Tabs.init({ id: 'source-file-tabs' }),
          maybeExampleUrl: () => Option.none(),
          currentSources: () => CurrentSourcesRemoteData.Loading(),
        }),
        [loadExampleSources(slug)],
      ],

      SucceededLoadExampleSources: ({ sources }) => [
        evo(model, {
          currentSources: () => CurrentSourcesRemoteData.Ok({ data: sources }),
        }),
        [],
      ],

      FailedLoadExampleSources: ({ error }) => [
        evo(model, {
          currentSources: () => CurrentSourcesRemoteData.Failure({ error }),
        }),
        [],
      ],
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

const chromeRecommendedHint: Html = p(
  [Class('text-xs text-gray-500 dark:text-gray-400')],
  ['Requires a Chromium browser'],
)

const launchPlaygroundSection = (
  meta: ExampleMeta,
  isChromium: boolean,
): Html =>
  div(
    [Class('flex flex-col items-start gap-1')],
    [
      a(
        [
          Href(playgroundRouter({ exampleSlug: meta.slug })),
          Class('cta-amber-sm'),
        ],
        [Icon.bolt('w-4 h-4'), 'Launch Playground'],
      ),
      ...(isChromium ? [] : [chromeRecommendedHint]),
    ],
  )

const headerView = (meta: ExampleMeta, isChromium: boolean): Html =>
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
      div(
        [Class('flex flex-col items-start gap-3 mt-3')],
        [
          launchPlaygroundSection(meta, isChromium),
          a(
            [
              Href(exampleSourceHref(meta.slug)),
              Class(
                'text-sm text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
              ),
            ],
            ['View source on GitHub'],
          ),
        ],
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
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  Ui.Disclosure.view({
    model: disclosureModel,
    toParentMessage: message =>
      toParentMessage(GotLivePreviewDisclosureMessage({ message })),
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
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const filePaths = Array.map(files, file => file.path)

  return Ui.Tabs.view({
    model: tabsModel,
    toParentMessage: message =>
      toParentMessage(GotSourceFileTabsMessage({ message })),
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

const skeletonFileRowClasses: ReadonlyArray<string> = [
  'w-32',
  'w-40',
  'w-28',
  'w-36',
]

const sourcesSkeletonView = (): Html =>
  div(
    [
      Class(
        'flex flex-col lg:flex-row overflow-hidden max-h-[80vh] border border-gray-200 dark:border-gray-700/50 animate-pulse',
      ),
    ],
    [
      div(
        [
          Class(
            'flex flex-shrink-0 overflow-hidden lg:w-44 lg:flex-col bg-gray-200 dark:bg-gray-800/50 p-3 gap-2',
          ),
        ],
        Array.map(skeletonFileRowClasses, widthClass =>
          div(
            [Class(`h-5 ${widthClass} rounded bg-gray-300 dark:bg-gray-700`)],
            [],
          ),
        ),
      ),
      div(
        [
          Class(
            'flex-1 min-h-[24rem] bg-gray-100 dark:bg-gray-800/30 p-6 space-y-3',
          ),
        ],
        [
          div([Class('h-4 w-11/12 rounded bg-gray-300 dark:bg-gray-700')], []),
          div([Class('h-4 w-10/12 rounded bg-gray-300 dark:bg-gray-700')], []),
          div([Class('h-4 w-8/12 rounded bg-gray-300 dark:bg-gray-700')], []),
          div([Class('h-4 w-11/12 rounded bg-gray-300 dark:bg-gray-700')], []),
          div([Class('h-4 w-9/12 rounded bg-gray-300 dark:bg-gray-700')], []),
          div([Class('h-4 w-10/12 rounded bg-gray-300 dark:bg-gray-700')], []),
        ],
      ),
    ],
  )

const sourcesFailureView = (error: string): Html =>
  div(
    [Class('rounded-lg border border-red-300 dark:border-red-800 p-6')],
    [
      h3(
        [Class('text-base font-semibold text-red-700 dark:text-red-400 mb-2')],
        ['Failed to load example sources'],
      ),
      div([Class('text-sm text-gray-600 dark:text-gray-400')], [error]),
    ],
  )

export const view = (
  model: Model,
  slug: string,
  copiedSnippets: CopiedSnippets,
  isNarrowViewport: boolean,
  isChromium: boolean,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  Option.match(findBySlug(slug), {
    onNone: () => div([], ['Example not found']),
    onSome: meta =>
      keyed('div')(
        slug,
        [],
        [
          headerView(meta, isChromium),
          livePreviewDisclosureView(
            model.livePreviewDisclosure,
            meta,
            slug,
            model.maybeExampleUrl,
            toParentMessage,
          ),
          div(
            [Class('mt-6')],
            [
              M.value(model.currentSources).pipe(
                M.withReturnType<Html>(),
                M.tag('NotAsked', 'Loading', () => sourcesSkeletonView()),
                M.tag('Failure', ({ error }) => sourcesFailureView(error)),
                M.tag('Ok', ({ data: sources }) =>
                  sourceCodeView(
                    sources.files,
                    model.sourceFileTabs,
                    copiedSnippets,
                    isNarrowViewport,
                    toParentMessage,
                  ),
                ),
                M.exhaustive,
              ),
            ],
          ),
        ],
      ),
  })

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []
