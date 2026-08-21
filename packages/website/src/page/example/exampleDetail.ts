import {
  Array,
  Effect,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Command, Mount, Submodel, type Update } from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Disclosure, Tabs } from '@foldkit/ui'

import { Icon } from '../../icon'
import { exampleSourceHref } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para } from '../../prose'
import { examplesRouter, playgroundRouter } from '../../route'
import {
  type RenderCopyButton,
  highlightedCodeBlockFor,
} from '../../view/codeBlock'
import { type ExampleMeta, findBySlug } from './meta'
import {
  type ExampleSourceFile,
  ExampleSources,
  loadSourcesForSlug,
} from './sources'

// MODEL

export const CurrentSourcesAsyncData = AsyncData.Schema(
  ExampleSources,
  S.String,
)

export const Model = S.Struct({
  sourceFileTabs: Tabs.Model,
  maybeActiveSourceFilePath: S.Option(S.String),
  maybeExampleUrl: S.Option(S.String),
  isLivePreviewOpen: S.Boolean,
  currentSources: CurrentSourcesAsyncData.schema,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotSourceFileTabsMessage: { message: Tabs.Message },
  ChangedExampleUrl: { url: S.String },
  ToggledLivePreview: { isOpen: S.Boolean },
  RequestedExampleSources: { slug: S.String },
  SucceededLoadExampleSources: { sources: ExampleSources },
  FailedLoadExampleSources: { error: S.String },
})

export type Message = typeof Message.Type

// COMMAND

/** Loads the source files for the example identified by `slug`, producing the
 *  loaded sources on success or a failure Message when the fetch does not
 *  complete. */
export const LoadExampleSources = Command.define('LoadExampleSources', {
  args: { slug: S.String },
  messages: [
    Message.SucceededLoadExampleSources,
    Message.FailedLoadExampleSources,
  ],
  execute: ({ slug }) =>
    Effect.tryPromise({
      try: () => loadSourcesForSlug(slug),
      catch: error =>
        error instanceof Error ? error.message : `Unknown example: ${slug}`,
    }).pipe(
      Effect.map(sources => Message.SucceededLoadExampleSources({ sources })),
      Effect.catch(error =>
        Effect.succeed(Message.FailedLoadExampleSources({ error })),
      ),
    ),
})

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
  Message.ChangedExampleUrl,
)(element => {
  if (!(element instanceof HTMLIFrameElement)) {
    return Stream.empty
  }
  return Stream.callback<typeof Message.ChangedExampleUrl.Type>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const handler = (event: MessageEvent) => {
          if (!isExampleUrlMessageFromIframe(event, element)) {
            return
          }
          Queue.offerUnsafe(
            queue,
            Message.ChangedExampleUrl({ url: event.data.url }),
          )
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

export const init = (): Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}> => ({
  model: {
    sourceFileTabs: Tabs.init({ id: 'source-file-tabs' }),
    maybeActiveSourceFilePath: Option.none(),
    maybeExampleUrl: Option.none(),
    isLivePreviewOpen: true,
    currentSources: CurrentSourcesAsyncData.Idle(),
  },
})

export const boot = (
  maybeInitialSlug: Option.Option<string>,
): Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}> => {
  const initResult = init()
  return Option.match(maybeInitialSlug, {
    onNone: () => initResult,
    onSome: slug => {
      const updateResult = update(
        initResult.model,
        Message.RequestedExampleSources({ slug }),
      )
      return {
        model: updateResult.model,
        commands: [
          ...(initResult.commands ?? []),
          ...(updateResult.commands ?? []),
        ],
      }
    },
  })
}

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotSourceFileTabsMessage: ({ message }) => {
      const sourceFileTabsUpdate = SourceFileTabs.update(
        model.sourceFileTabs,
        message,
      )

      const nextMaybeActiveSourceFilePath = Option.fromNullishOr(
        sourceFileTabsUpdate.outMessage,
      ).pipe(
        Option.match({
          onNone: () => model.maybeActiveSourceFilePath,
          onSome: M.type<Tabs.OutMessage>().pipe(
            M.tagsExhaustive({
              Selected: ({ value }) => Option.some(value),
            }),
          ),
        }),
      )

      return {
        model: evo(model, {
          sourceFileTabs: () => sourceFileTabsUpdate.model,
          maybeActiveSourceFilePath: () => nextMaybeActiveSourceFilePath,
        }),
        commands: Command.mapMessages(
          sourceFileTabsUpdate.commands ?? [],
          message => Message.GotSourceFileTabsMessage({ message }),
        ),
      }
    },
    ChangedExampleUrl: ({ url }) => ({
      model: evo(model, { maybeExampleUrl: () => Option.some(url) }),
    }),
    ToggledLivePreview: ({ isOpen }) => ({
      model: evo(model, { isLivePreviewOpen: () => isOpen }),
    }),

    RequestedExampleSources: ({ slug }) => ({
      model: evo(model, {
        sourceFileTabs: () => Tabs.init({ id: 'source-file-tabs' }),
        maybeActiveSourceFilePath: () => Option.none(),
        maybeExampleUrl: () => Option.none(),
        currentSources: () => CurrentSourcesAsyncData.Loading(),
      }),
      commands: [LoadExampleSources({ slug })],
    }),

    SucceededLoadExampleSources: ({ sources }) => ({
      model: evo(model, {
        maybeActiveSourceFilePath: () =>
          pipe(
            sources.files,
            Array.head,
            Option.map(file => file.path),
          ),
        currentSources: () =>
          CurrentSourcesAsyncData.Success({ data: sources }),
      }),
    }),

    FailedLoadExampleSources: ({ error }) => ({
      model: evo(model, {
        currentSources: () => CurrentSourcesAsyncData.Failure({ error }),
      }),
    }),
  })

export const informRouteChanged = (model: Model, slug: string) =>
  update(model, Message.RequestedExampleSources({ slug }))

// VIEW

const featureTag = (text: string): Html =>
  ih.div(
    [
      ih.Class(
        'text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      ),
    ],
    [text],
  )

const chromeRecommendedHint = (): Html =>
  ih.p(
    [ih.Class('text-xs text-gray-500 dark:text-gray-400')],
    ['Requires a Chromium browser'],
  )

const launchPlaygroundSection = (
  meta: ExampleMeta,
  isShowingChromeHint: boolean,
): Html =>
  ih.div(
    [ih.Class('flex flex-col items-start gap-1')],
    [
      ih.a(
        [
          ih.Href(playgroundRouter({ exampleSlug: meta.slug })),
          ih.Class('cta-amber-sm'),
        ],
        [Icon.bolt('w-4 h-4'), 'Launch Playground'],
      ),
      ...(isShowingChromeHint ? [chromeRecommendedHint()] : []),
    ],
  )

const headerView = (meta: ExampleMeta, isShowingChromeHint: boolean): Html =>
  ih.div(
    [ih.Class('mb-6')],
    [
      ih.a(
        [
          ih.Href(examplesRouter()),
          ih.Class(
            'inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4',
          ),
        ],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
      pageTitle('example-detail', meta.title),
      para(meta.description),
      ih.div(
        [ih.Class('flex flex-wrap items-center gap-2 mt-3')],
        Array.map(meta.tags, text => featureTag(text)),
      ),
      ih.div(
        [ih.Class('flex flex-col items-start gap-3 mt-3')],
        [
          launchPlaygroundSection(meta, isShowingChromeHint),
          ih.a(
            [
              ih.Href(exampleSourceHref(meta.slug)),
              ih.Class(
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

const trafficLightDots = (): Html =>
  ih.div(
    [ih.Class('flex gap-1.5')],
    [
      ih.div([ih.Class('w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/60')]),
      ih.div([
        ih.Class('w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/60'),
      ]),
      ih.div([
        ih.Class('w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/60'),
      ]),
    ],
  )

const DISCLOSURE_BUTTON_CLASS =
  'w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium cursor-pointer transition border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-xl data-[open]:rounded-b-none select-none'

const DISCLOSURE_PANEL_CLASS =
  'rounded-b-xl overflow-hidden border-x border-b border-gray-200 dark:border-gray-700/50 shadow-sm'

const disclosureChevron = (isOpen: boolean): Html =>
  ih.span(
    [
      ih.Class(
        `transition-transform text-gray-400 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const playgroundOnlyNotice = (meta: ExampleMeta): Html =>
  ih.div(
    [
      ih.Class(
        'rounded-xl border border-gray-200 dark:border-gray-700/50 px-4 py-3 text-sm text-gray-700 dark:text-gray-300',
      ),
    ],
    [
      `${meta.title} renders each page on a server at request time, so a ` +
        'static preview cannot demonstrate it. Launch the playground to see ' +
        'the server round-trip live, or run the example locally.',
    ],
  )

const livePreviewDisclosureView = (
  isLivePreviewOpen: boolean,
  meta: ExampleMeta,
  slug: string,
  maybeExampleUrl: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  Disclosure.view(
    {
      id: 'live-preview',
      isOpen: isLivePreviewOpen,
      onToggle: isOpen => Message.ToggledLivePreview({ isOpen }),
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
                    disclosureChevron(isLivePreviewOpen),
                  ],
                ),
              ],
            ),
            h.div(
              [
                ...attributes.panel,
                h.Class(DISCLOSURE_PANEL_CLASS),
                h.Hidden(!isLivePreviewOpen),
                ...(isLivePreviewOpen ? [] : [h.Style({ display: 'none' })]),
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
                    h.iframe([
                      h.Src(`/example-apps-embed/${slug}/index.html?embedded`),
                      h.Class('w-full bg-white h-[40rem]'),
                      h.AriaLabel(`${meta.title} example running live`),
                      h.OnMount(ObserveExampleUrlMessages()),
                    ]),
                  ],
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )

const SourceFileTabs = Tabs.create()

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
  tabsModel: Tabs.Model,
  activeSourceFilePath: string,
  isNarrowViewport: boolean,
  renderCopyButton: RenderCopyButton,
  h: HtmlBuilder<Message>,
): Html => {
  const highlightedCodeBlock = highlightedCodeBlockFor(renderCopyButton)

  const filePaths = Array.map(files, file => file.path)

  return h.submodel({
    slotId: tabsModel.id,
    model: tabsModel,
    view: SourceFileTabs.view,
    viewInputs: {
      tabs: filePaths,
      selectedValue: activeSourceFilePath,
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
                              h.div([
                                h.Class('code-embed'),
                                h.InnerHTML(file.highlightedHtml),
                              ]),
                              file.rawCode,
                              `Copy ${file.path} to clipboard`,
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
    toParentMessage: message => Message.GotSourceFileTabsMessage({ message }),
  })
}

const skeletonFileRowClasses: ReadonlyArray<string> = [
  'w-32',
  'w-40',
  'w-28',
  'w-36',
]

const sourcesSkeletonView = (): Html =>
  ih.div(
    [
      ih.Class(
        'flex flex-col lg:flex-row overflow-hidden max-h-[80vh] border border-gray-200 dark:border-gray-700/50 animate-pulse',
      ),
    ],
    [
      ih.div(
        [
          ih.Class(
            'flex flex-shrink-0 overflow-hidden lg:w-44 lg:flex-col bg-gray-200 dark:bg-gray-800/50 p-3 gap-2',
          ),
        ],
        Array.map(skeletonFileRowClasses, widthClass =>
          ih.div([
            ih.Class(`h-5 ${widthClass} rounded bg-gray-300 dark:bg-gray-700`),
          ]),
        ),
      ),
      ih.div(
        [
          ih.Class(
            'flex-1 min-h-[24rem] bg-gray-100 dark:bg-gray-800/30 p-6 space-y-3',
          ),
        ],
        [
          ih.div([
            ih.Class('h-4 w-11/12 rounded bg-gray-300 dark:bg-gray-700'),
          ]),
          ih.div([
            ih.Class('h-4 w-10/12 rounded bg-gray-300 dark:bg-gray-700'),
          ]),
          ih.div([ih.Class('h-4 w-8/12 rounded bg-gray-300 dark:bg-gray-700')]),
          ih.div([
            ih.Class('h-4 w-11/12 rounded bg-gray-300 dark:bg-gray-700'),
          ]),
          ih.div([ih.Class('h-4 w-9/12 rounded bg-gray-300 dark:bg-gray-700')]),
          ih.div([
            ih.Class('h-4 w-10/12 rounded bg-gray-300 dark:bg-gray-700'),
          ]),
        ],
      ),
    ],
  )

const sourcesFailureView = (error: string): Html =>
  ih.div(
    [ih.Class('rounded-lg border border-red-300 dark:border-red-800 p-6')],
    [
      ih.h3(
        [
          ih.Class(
            'text-base font-semibold text-red-700 dark:text-red-400 mb-2',
          ),
        ],
        ['Failed to load example sources'],
      ),
      ih.div([ih.Class('text-sm text-gray-600 dark:text-gray-400')], [error]),
    ],
  )

type ViewInputs = Readonly<{
  slug: string
  isNarrowViewport: boolean
  isShowingChromeHint: boolean
  renderCopyButton: RenderCopyButton
}>

/**
 * Renders one example app: its header, the live preview, and the source files
 * behind a Tabs Submodel.
 *
 * The page is dispatched through `h.submodel`, so it takes `renderCopyButton`
 * from its parent rather than building the copy control itself. The control
 * carries an app-level Message, and a handler's dispatcher comes from the frame
 * the element is built in, so one built here would be rejected by this
 * Submodel's `toParentMessage`.
 */
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (
    model,
    { slug, isNarrowViewport, isShowingChromeHint, renderCopyButton },
    h,
  ): Html =>
    Option.match(findBySlug(slug), {
      onNone: () => h.div([], ['Example not found']),
      onSome: meta =>
        h.keyed('div')(
          slug,
          [],
          [
            headerView(meta, isShowingChromeHint),
            meta.livePreview === 'PlaygroundOnly'
              ? playgroundOnlyNotice(meta)
              : livePreviewDisclosureView(
                  model.isLivePreviewOpen,
                  meta,
                  slug,
                  model.maybeExampleUrl,
                  h,
                ),
            h.div(
              [h.Class('mt-6')],
              [
                AsyncData.matchData(model.currentSources, {
                  onEmpty: () => sourcesSkeletonView(),
                  onFailure: error => sourcesFailureView(error),
                  onData: sources =>
                    h.div(
                      [],
                      Array.match(sources.files, {
                        onEmpty: () => [],
                        onNonEmpty: files => [
                          sourceCodeView(
                            files,
                            model.sourceFileTabs,
                            Option.getOrElse(
                              model.maybeActiveSourceFilePath,
                              () => Array.headNonEmpty(files).path,
                            ),
                            isNarrowViewport,
                            renderCopyButton,
                            h,
                          ),
                        ],
                      }),
                    ),
                }),
              ],
            ),
          ],
        ),
    }),
)

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []
