import {
  Array,
  Effect,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
} from 'effect'
import { Command, Mount, Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Icon } from '../../icon'
import { exampleSourceHref } from '../../link'
import type { TableOfContentsEntry } from '../../main'
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
  maybeExampleUrl: S.Option(S.String),
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
const RequestedExampleSources = m('RequestedExampleSources', {
  slug: S.String,
})
export const SucceededLoadExampleSources = m('SucceededLoadExampleSources', {
  sources: ExampleSources,
})
export const FailedLoadExampleSources = m('FailedLoadExampleSources', {
  error: S.String,
})

export const Message = S.Union([
  GotSourceFileTabsMessage,
  ChangedExampleUrl,
  GotLivePreviewDisclosureMessage,
  RequestedExampleSources,
  SucceededLoadExampleSources,
  FailedLoadExampleSources,
])
export type Message = typeof Message.Type

// COMMAND

export const LoadExampleSources = Command.define(
  'LoadExampleSources',
  { slug: S.String },
  SucceededLoadExampleSources,
  FailedLoadExampleSources,
)(({ slug }) =>
  Effect.tryPromise({
    try: () => loadSourcesForSlug(slug),
    catch: error =>
      error instanceof Error ? error.message : `Unknown example: ${slug}`,
  }).pipe(
    Effect.map(sources => SucceededLoadExampleSources({ sources })),
    Effect.catch(error => Effect.succeed(FailedLoadExampleSources({ error }))),
  ),
)

// MOUNT

const BRIDGE_MESSAGE_TYPE = 'foldkit-example-url'

type ExampleUrlBridgeMessage = Readonly<{
  type: typeof BRIDGE_MESSAGE_TYPE
  url: string
}>

const isExampleUrlMessageFromIframe = (
  event: MessageEvent,
  iframe: HTMLIFrameElement,
): event is MessageEvent<ExampleUrlBridgeMessage> =>
  event.source === iframe.contentWindow &&
  event.origin === window.location.origin &&
  event.data &&
  typeof event.data === 'object' &&
  event.data.type === BRIDGE_MESSAGE_TYPE &&
  typeof event.data.url === 'string'

const ObserveExampleUrlMessages = Mount.defineStream(
  'ObserveExampleUrlMessages',
  ChangedExampleUrl,
)(element => {
  if (!(element instanceof HTMLIFrameElement)) {
    return Stream.empty
  }
  return Stream.callback<typeof ChangedExampleUrl.Type>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const handler = (event: MessageEvent) => {
          if (!isExampleUrlMessageFromIframe(event, element)) {
            return
          }
          Queue.offerUnsafe(queue, ChangedExampleUrl({ url: event.data.url }))
        }
        window.addEventListener('message', handler)
        return handler
      }),
      handler =>
        Effect.sync(() => window.removeEventListener('message', handler)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
})

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

export const boot = (
  maybeInitialSlug: Option.Option<string>,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [model, initCommands] = init()
  return Option.match(maybeInitialSlug, {
    onNone: () => [model, initCommands],
    onSome: slug => {
      const [bootedModel, bootCommands] = update(
        model,
        RequestedExampleSources({ slug }),
      )
      return [bootedModel, [...initCommands, ...bootCommands]]
    },
  })
}

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
        const [nextTabs, tabsCommands] = SourceFileTabs.update(
          model.sourceFileTabs,
          message,
        )
        return [
          evo(model, { sourceFileTabs: () => nextTabs }),
          Command.mapMessages(tabsCommands, message =>
            GotSourceFileTabsMessage({ message }),
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
          Command.mapMessages(disclosureCommands, message =>
            GotLivePreviewDisclosureMessage({ message }),
          ),
        ]
      },

      RequestedExampleSources: ({ slug }) => [
        evo(model, {
          sourceFileTabs: () => Ui.Tabs.init({ id: 'source-file-tabs' }),
          maybeExampleUrl: () => Option.none(),
          currentSources: () => CurrentSourcesRemoteData.Loading(),
        }),
        [LoadExampleSources({ slug })],
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

export const informRouteChanged = (model: Model, slug: string) =>
  update(model, RequestedExampleSources({ slug }))

// VIEW

const featureTag = (text: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      ),
    ],
    [text],
  )
}

const chromeRecommendedHint = (): Html => {
  const h = html<Message>()

  return h.p(
    [h.Class('text-xs text-gray-500 dark:text-gray-400')],
    ['Requires a Chromium browser'],
  )
}

const launchPlaygroundSection = (
  meta: ExampleMeta,
  isChromium: boolean,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex flex-col items-start gap-1')],
    [
      h.a(
        [
          h.Href(playgroundRouter({ exampleSlug: meta.slug })),
          h.Class('cta-amber-sm'),
        ],
        [Icon.bolt('w-4 h-4'), 'Launch Playground'],
      ),
      ...(isChromium ? [] : [chromeRecommendedHint()]),
    ],
  )
}

const headerView = (meta: ExampleMeta, isChromium: boolean): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-6')],
    [
      h.a(
        [
          h.Href(examplesRouter()),
          h.Class(
            'inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4',
          ),
        ],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
      pageTitle('example-detail', meta.title),
      para(meta.description),
      h.div(
        [h.Class('flex flex-wrap items-center gap-2 mt-3')],
        Array.map(meta.tags, text => featureTag(text)),
      ),
      h.div(
        [h.Class('flex flex-col items-start gap-3 mt-3')],
        [
          launchPlaygroundSection(meta, isChromium),
          h.a(
            [
              h.Href(exampleSourceHref(meta.slug)),
              h.Class(
                'text-sm text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
              ),
            ],
            ['View source on GitHub'],
          ),
        ],
      ),
    ],
  )
}

const urlBarContent = (
  meta: ExampleMeta,
  maybeExampleUrl: Option.Option<string>,
): string =>
  meta.hasRouting ? Option.getOrElse(maybeExampleUrl, () => '/') : '/'

const trafficLightDots = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex gap-1.5')],
    [
      h.div(
        [h.Class('w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/60')],
        [],
      ),
      h.div(
        [h.Class('w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/60')],
        [],
      ),
      h.div(
        [h.Class('w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/60')],
        [],
      ),
    ],
  )
}

const DISCLOSURE_BUTTON_CLASS =
  'w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium cursor-pointer transition border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-xl data-[open]:rounded-b-none select-none'

const DISCLOSURE_PANEL_CLASS =
  'rounded-b-xl overflow-hidden border-x border-b border-gray-200 dark:border-gray-700/50 shadow-sm'

const disclosureChevron = (isOpen: boolean): Html => {
  const h = html<Message>()

  return h.span(
    [
      h.Class(
        `transition-transform text-gray-400 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )
}

const livePreviewDisclosureView = (
  disclosureModel: Ui.Disclosure.Model,
  meta: ExampleMeta,
  slug: string,
  maybeExampleUrl: Option.Option<string>,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: disclosureModel.id,
    model: disclosureModel,
    view: Ui.Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.div(
          [],
          [
            h.button(
              [...attributes.button, h.Class(DISCLOSURE_BUTTON_CLASS)],
              [
                h.div(
                  [h.Class('flex items-center justify-between w-full')],
                  [
                    h.span([], ['Live Preview']),
                    disclosureChevron(disclosureModel.isOpen),
                  ],
                ),
              ],
            ),
            h.div(
              [
                ...attributes.panel,
                h.Class(DISCLOSURE_PANEL_CLASS),
                h.Hidden(!disclosureModel.isOpen),
                ...(disclosureModel.isOpen
                  ? []
                  : [h.Style({ display: 'none' })]),
              ],
              [
                h.div(
                  [],
                  [
                    h.div(
                      [
                        h.Class(
                          'flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/50',
                        ),
                      ],
                      [
                        trafficLightDots(),
                        h.div(
                          [
                            h.Class(
                              'flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded px-3 py-1 text-center truncate',
                            ),
                          ],
                          [urlBarContent(meta, maybeExampleUrl)],
                        ),
                      ],
                    ),
                    h.iframe(
                      [
                        h.Src(
                          `/example-apps-embed/${slug}/index.html?embedded`,
                        ),
                        h.Class('w-full bg-white h-[40rem]'),
                        h.AriaLabel(`${meta.title} example running live`),
                        h.OnMount(ObserveExampleUrlMessages()),
                      ],
                      [],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
    },
    toParentMessage: message => GotLivePreviewDisclosureMessage({ message }),
  })
}

const SourceFileTabs = Ui.Tabs.create()

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
): Html => {
  const h = html<Message>()

  const filePaths = Array.map(files, file => file.path)

  return h.submodel({
    slotId: tabsModel.id,
    model: tabsModel,
    view: SourceFileTabs.view,
    viewInputs: {
      tabs: filePaths,
      ariaLabel: 'Source files',
      orientation: isNarrowViewport ? 'Horizontal' : 'Vertical',
      toView: ({ tablist, tabs, activeIndex }) =>
        h.div(
          [
            h.Class(
              'flex flex-col lg:flex-row overflow-hidden max-h-[80vh] border border-gray-200 dark:border-gray-700/50',
            ),
          ],
          [
            h.div(
              [
                ...tablist,
                h.Class(
                  'flex flex-shrink-0 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:w-44 lg:flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700/50 bg-gray-200 dark:bg-gray-800/50 divide-x lg:divide-x-0 lg:divide-y divide-gray-200 dark:divide-gray-700/50',
                ),
              ],
              tabs.map(tab =>
                h.button(
                  [
                    ...tab.tab,
                    h.Class(
                      tab.isActive ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE,
                    ),
                  ],
                  [h.span([], [tab.value.replaceAll('/', '/​')])],
                ),
              ),
            ),
            ...tabs
              .filter(tab => tab.index === activeIndex)
              .map(tab => {
                const maybeFile = Array.findFirst(
                  files,
                  file => file.path === tab.value,
                )
                return h.div(
                  [...tab.panel, h.Class('code-embed-panel')],
                  [
                    Option.match(maybeFile, {
                      onNone: () => h.empty,
                      onSome: file =>
                        h.div(
                          [h.Class('code-embed-scroll')],
                          [
                            highlightedCodeBlock(
                              h.div(
                                [
                                  h.Class('code-embed'),
                                  h.InnerHTML(file.highlightedHtml),
                                ],
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
                  ],
                )
              }),
          ],
        ),
    },
    toParentMessage: message => GotSourceFileTabsMessage({ message }),
  })
}

const skeletonFileRowClasses: ReadonlyArray<string> = [
  'w-32',
  'w-40',
  'w-28',
  'w-36',
]

const sourcesSkeletonView = (): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'flex flex-col lg:flex-row overflow-hidden max-h-[80vh] border border-gray-200 dark:border-gray-700/50 animate-pulse',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'flex flex-shrink-0 overflow-hidden lg:w-44 lg:flex-col bg-gray-200 dark:bg-gray-800/50 p-3 gap-2',
          ),
        ],
        Array.map(skeletonFileRowClasses, widthClass =>
          h.div(
            [h.Class(`h-5 ${widthClass} rounded bg-gray-300 dark:bg-gray-700`)],
            [],
          ),
        ),
      ),
      h.div(
        [
          h.Class(
            'flex-1 min-h-[24rem] bg-gray-100 dark:bg-gray-800/30 p-6 space-y-3',
          ),
        ],
        [
          h.div(
            [h.Class('h-4 w-11/12 rounded bg-gray-300 dark:bg-gray-700')],
            [],
          ),
          h.div(
            [h.Class('h-4 w-10/12 rounded bg-gray-300 dark:bg-gray-700')],
            [],
          ),
          h.div(
            [h.Class('h-4 w-8/12 rounded bg-gray-300 dark:bg-gray-700')],
            [],
          ),
          h.div(
            [h.Class('h-4 w-11/12 rounded bg-gray-300 dark:bg-gray-700')],
            [],
          ),
          h.div(
            [h.Class('h-4 w-9/12 rounded bg-gray-300 dark:bg-gray-700')],
            [],
          ),
          h.div(
            [h.Class('h-4 w-10/12 rounded bg-gray-300 dark:bg-gray-700')],
            [],
          ),
        ],
      ),
    ],
  )
}

const sourcesFailureView = (error: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('rounded-lg border border-red-300 dark:border-red-800 p-6')],
    [
      h.h3(
        [
          h.Class(
            'text-base font-semibold text-red-700 dark:text-red-400 mb-2',
          ),
        ],
        ['Failed to load example sources'],
      ),
      h.div([h.Class('text-sm text-gray-600 dark:text-gray-400')], [error]),
    ],
  )
}

type ViewInputs = Readonly<{
  slug: string
  copiedSnippets: CopiedSnippets
  isNarrowViewport: boolean
  isChromium: boolean
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { slug, copiedSnippets, isNarrowViewport, isChromium }): Html => {
    const h = html<Message>()

    return Option.match(findBySlug(slug), {
      onNone: () => h.div([], ['Example not found']),
      onSome: meta =>
        h.keyed('div')(
          slug,
          [],
          [
            headerView(meta, isChromium),
            livePreviewDisclosureView(
              model.livePreviewDisclosure,
              meta,
              slug,
              model.maybeExampleUrl,
            ),
            h.div(
              [h.Class('mt-6')],
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
                    ),
                  ),
                  M.exhaustive,
                ),
              ],
            ),
          ],
        ),
    })
  },
)

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []
