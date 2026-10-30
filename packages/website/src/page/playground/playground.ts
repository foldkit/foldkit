import { clsx } from 'clsx'
import {
  Array,
  Deferred,
  Effect,
  FiberMap,
  Layer,
  Match,
  Option,
  Order,
  Record,
  Schema,
  pipe,
} from 'effect'
import { Block, Command, type Mount } from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'
import filesBySlug from 'virtual:playground-files'

import { Icon } from '../../icon'
import { exampleDetailRouter, examplesRouter } from '../../route'
import { type ExampleMeta, findBySlug } from '../example/meta'
import * as PlaygroundPreview from '../playgroundPreview'
import { reasonFromError } from '../playgroundWebContainer'
import { PlaygroundContainer, PlaygroundContainerLive } from './container'
import { PlaygroundFileTabs } from './fileTabs'
import { Message, Model, PlaygroundState } from './model'
import { MountPlaygroundEditor, streamPlaygroundEditorMessages } from './mount'

type PlaygroundViewBuilder = HtmlBuilder<
  Message,
  Mount.RequirementsOf<typeof MountPlaygroundEditor>
>

const PREFERRED_INITIAL_FILES: ReadonlyArray<string> = ['src/application.ts']

const maybeFilesForSlug = (
  slug: string,
): Option.Option<Readonly<Record<string, string>>> =>
  pipe(
    filesBySlug,
    Record.get(slug),
    Option.map(entry => entry.files),
  )

const isUnavailableExample = (maybeMeta: Option.Option<ExampleMeta>): boolean =>
  Option.match(maybeMeta, {
    onNone: () => false,
    onSome: meta => meta.livePreview === 'Unavailable',
  })

const sortedPaths = (
  files: Readonly<Record<string, string>>,
): ReadonlyArray<string> => pipe(files, Record.keys, Array.sort(Order.String))

const initialActiveFile = (files: Readonly<Record<string, string>>): string =>
  pipe(
    PREFERRED_INITIAL_FILES,
    Array.findFirst(preferred => Record.has(files, preferred)),
    Option.orElse(() => Array.head(sortedPaths(files))),
    Option.getOrElse(() => ''),
  )

// NOTE: Vite's HMR for a content file (`src/application.ts`) doesn't reliably
// invalidate Tailwind's CSS module in the WebContainer. After writing the
// content file, we write `src/styles.css` back to itself so Vite emits a
// CSS HMR update; that re-runs the Tailwind plugin against the latest
// content tree and the new utility classes show up in the preview.
const STYLES_CSS_PATH = 'src/styles.css'

const WRITE_DEBOUNCE_MILLIS = 250

export const WaitForPlaygroundServerFailure = Command.define(
  'WaitForPlaygroundServerFailure',
  { messages: [Message.CompletedWaitForPlaygroundServerFailure] },
)

export const SchedulePlaygroundFileWrite = Command.define(
  'SchedulePlaygroundFileWrite',
  {
    args: { path: Schema.String, content: Schema.String },
    messages: [
      Message.SucceededSchedulePlaygroundFileWrite,
      Message.FailedSchedulePlaygroundFileWrite,
    ],
  },
)

const hasPlaygroundFiles = (slug: string): boolean =>
  Record.has(filesBySlug, slug)

const isContainerRequired = ({
  slug,
  state,
  maybeIsSupported,
}: Model): boolean =>
  state._tag !== 'Failed' &&
  state._tag !== 'Idle' &&
  Option.contains(maybeIsSupported, true) &&
  hasPlaygroundFiles(slug)

const appendDeduped = (
  paths: ReadonlyArray<string>,
  path: string,
): ReadonlyArray<string> =>
  Array.contains(paths, path) ? paths : [...paths, path]

const flushDirtyPaths = (
  model: Model,
): ReadonlyArray<ReturnType<typeof SchedulePlaygroundFileWrite>> =>
  model.dirtyPaths.flatMap(path =>
    pipe(
      Record.get(model.files, path),
      Option.map(content => SchedulePlaygroundFileWrite({ path, content })),
      Option.toArray,
    ),
  )

const markPreviewLoaded = (
  state: PlaygroundState,
  previewUrl: string,
): PlaygroundState =>
  Match.value(state).pipe(
    Match.tag('Booted', bootedState => {
      const nextPreview = PlaygroundPreview.load(
        bootedState.preview,
        previewUrl,
      )
      if (nextPreview === bootedState.preview) {
        return state
      } else {
        return PlaygroundState.Booted({ preview: nextPreview })
      }
    }),
    Match.orElse(() => state),
  )

const FILE_TAB_BUTTON_BASE_CLASS =
  'block w-full text-left px-3 py-1.5 font-mono text-xs'

const fileTabButtonClassName = clsx(
  FILE_TAB_BUTTON_BASE_CLASS,
  'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
  'data-[selected]:bg-gray-200 data-[selected]:dark:bg-gray-800 data-[selected]:text-gray-900 data-[selected]:dark:text-gray-100 hover:cursor-pointer',
)

const backToExampleButton = (maybeMeta: Option.Option<ExampleMeta>): Html =>
  Option.match(maybeMeta, {
    onNone: () =>
      ih.a(
        [ih.Href(examplesRouter()), ih.Class('cta-secondary')],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
    onSome: meta =>
      ih.a(
        [
          ih.Href(exampleDetailRouter({ exampleSlug: meta.slug })),
          ih.Class('cta-secondary'),
        ],
        [Icon.chevronLeft('w-4 h-4'), `Back to ${meta.title}`],
      ),
  })

const messageView = (
  heading: string,
  body: string,
  maybeMeta: Option.Option<ExampleMeta>,
): Html =>
  ih.div(
    [
      ih.Class(
        'flex-1 flex items-center justify-center px-6 py-20 text-center',
      ),
    ],
    [
      ih.div(
        [ih.Class('max-w-md flex flex-col items-center')],
        [
          ih.div(
            [
              ih.Class(
                'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
              ),
            ],
            [heading],
          ),
          ih.div(
            [ih.Class('text-sm text-gray-700 dark:text-gray-400 mb-6')],
            [body],
          ),
          backToExampleButton(maybeMeta),
        ],
      ),
    ],
  )

const spinnerView = (): Html =>
  ih.div([
    ih.Class(
      'w-8 h-8 mb-6 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 animate-spin',
    ),
    ih.AriaLabel('Loading'),
    ih.Role('status'),
  ])

const bootingPanelView = (heading: string, body: string): Html =>
  ih.div(
    [
      ih.Class(
        'flex-1 flex items-center justify-center px-6 py-20 text-center',
      ),
    ],
    [
      ih.div(
        [ih.Class('max-w-xl flex flex-col items-center min-w-0')],
        [
          spinnerView(),
          ih.div(
            [ih.Class('text-base font-semibold text-gray-900 mb-2')],
            [heading],
          ),
          ih.div([ih.Class('text-sm text-gray-700')], [body]),
        ],
      ),
    ],
  )

const failurePanelView = (reason: string): Html =>
  ih.div(
    [
      ih.Class(
        'flex-1 flex items-center justify-center px-6 py-20 text-center',
      ),
    ],
    [
      ih.div(
        [ih.Class('max-w-sm flex flex-col items-center')],
        [
          ih.div(
            [ih.Class('text-base font-semibold text-gray-900 mb-2')],
            ['Playground failed to load'],
          ),
          ih.div(
            [
              ih.Class(
                'w-full max-h-64 overflow-auto text-left text-sm text-gray-700 whitespace-pre-wrap break-words',
              ),
            ],
            [reason],
          ),
        ],
      ),
    ],
  )

const editorPanelContent = (
  path: string,
  content: string,
  files: Readonly<Record<string, string>>,
  h: PlaygroundViewBuilder,
): Html =>
  h.div(
    [h.Class('flex-1 min-w-0 min-h-0 flex flex-col bg-[#1e1e1e] text-sm')],
    [
      h.keyed('div')(`editor-${path}`, [
        h.Class('flex-1 min-h-0 min-w-0 overflow-hidden'),
        h.OnMount(
          MountPlaygroundEditor({ path, initialContent: content, files }),
        ),
      ]),
    ],
  )

const previewPaneView = (
  state: PlaygroundState,
  h: PlaygroundViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'flex-1 min-w-0 min-h-0 flex flex-col border-l max-playground-wide:border-l-0 max-playground-wide:border-t border-gray-200 dark:border-gray-800 bg-white',
      ),
    ],
    [
      h.div(
        [h.Class('flex-1 min-w-0 min-h-0 flex flex-col')],
        [
          PlaygroundState.match(state, {
            Idle: () =>
              bootingPanelView(
                'Starting playground…',
                'The preview will appear when the development environment is ready.',
              ),
            Booting: () =>
              bootingPanelView(
                'Starting playground…',
                'The first load can take about 30 seconds. The preview will appear when the development environment is ready.',
              ),
            Booted: ({ preview }) =>
              PlaygroundPreview.view(
                preview,
                Message.LoadedPlaygroundPreview({
                  previewUrl: preview.previewUrl,
                }),
                bootingPanelView(
                  'Preparing preview…',
                  'The server is running. The preview will appear when the page finishes loading.',
                ),
                h,
              ),
            Failed: ({ reason }) => failurePanelView(reason),
          }),
        ],
      ),
    ],
  )

const writeErrorBannerView = (maybeError: Option.Option<string>): Html =>
  Option.match(maybeError, {
    onNone: () => ih.div([ih.Class('hidden')]),
    onSome: reason =>
      ih.div(
        [
          ih.Class(
            'shrink-0 px-4 py-2 text-xs border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-200',
          ),
          ih.Role('alert'),
        ],
        [`Playground write failed: ${reason}`],
      ),
  })

const tooNarrowMessageView = (): Html =>
  ih.div(
    [
      ih.Class(
        'flex-1 hidden max-md:flex items-center justify-center px-6 py-20 text-center',
      ),
    ],
    [
      ih.div(
        [ih.Class('max-w-md flex flex-col items-center')],
        [
          ih.div(
            [
              ih.Class(
                'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
              ),
            ],
            ['Use a wider screen'],
          ),
          ih.div(
            [ih.Class('text-sm text-gray-700 dark:text-gray-400')],
            ['The live editor and preview need more horizontal space.'],
          ),
        ],
      ),
    ],
  )

const responsiveEditorView = (model: Model, h: PlaygroundViewBuilder): Html =>
  h.div(
    [h.Class('flex-1 min-h-0 flex flex-col')],
    [
      tooNarrowMessageView(),
      h.div(
        [h.Class('flex-1 min-h-0 min-w-0 flex max-md:hidden')],
        [editorLayoutView(model, h)],
      ),
    ],
  )

const editorLayoutView = (model: Model, h: PlaygroundViewBuilder): Html => {
  const paths = sortedPaths(model.files)
  return h.div(
    [h.Class('flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden')],
    [
      writeErrorBannerView(model.lastWriteError),
      h.div(
        [h.Class('flex-1 min-h-0 min-w-0 flex max-playground-wide:flex-col')],
        [
          model.fileTabs.view({
            tabs: paths,
            selectedValue: model.activeFilePath,
            ariaLabel: 'Playground files',
            orientation: 'Vertical',
            toView: ({ tablist, tabs, activeIndex }) =>
              h.div(
                [
                  h.Class(
                    'shrink-0 min-h-0 flex w-[1056px] max-playground-wide:w-full max-playground-wide:h-1/2',
                  ),
                ],
                [
                  h.div(
                    [
                      ...tablist,
                      h.Class(
                        'w-56 shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-3 text-sm flex flex-col',
                      ),
                    ],
                    tabs.map(tab =>
                      h.button(
                        [...tab.tab, h.Class(fileTabButtonClassName)],
                        [h.span([], [tab.value])],
                      ),
                    ),
                  ),
                  ...tabs
                    .filter(tab => tab.index === activeIndex)
                    .map(tab =>
                      h.div(
                        [
                          ...tab.panel,
                          h.Class('flex-1 min-w-0 min-h-0 flex flex-col'),
                        ],
                        [
                          editorPanelContent(
                            tab.value,
                            pipe(
                              Record.get(model.files, tab.value),
                              Option.getOrElse(() => ''),
                            ),
                            model.files,
                            h,
                          ),
                        ],
                      ),
                    ),
                ],
              ),
          }),
          previewPaneView(model.state, h),
        ],
      ),
    ],
  )
}

export type ViewInputs = Readonly<{
  maybeIsPlaygroundSupported: Option.Option<boolean>
}>

const view = (
  model: Model,
  h: PlaygroundViewBuilder,
  { maybeIsPlaygroundSupported }: ViewInputs,
): Html => {
  const maybeMeta = findBySlug(model.slug)
  const maybeFiles = Option.fromNullishOr(filesBySlug[model.slug])

  const content = Match.value({
    maybeIsPlaygroundSupported,
    maybeMeta,
    maybeFiles,
  }).pipe(
    Match.when(
      ({ maybeMeta }) => isUnavailableExample(maybeMeta),
      () =>
        messageView(
          'Playground unavailable',
          'This example is paused while we update and verify LiveStore compatibility with Effect 4 stable.',
          maybeMeta,
        ),
    ),
    Match.when(
      ({ maybeIsPlaygroundSupported }) =>
        Option.isNone(maybeIsPlaygroundSupported),
      () =>
        messageView(
          'Playground availability',
          'The Playground needs SharedArrayBuffer on an isolated page and a compatible embedded preview. If the editor does not open, you can still see the example on its detail page.',
          maybeMeta,
        ),
    ),
    Match.when(
      ({ maybeIsPlaygroundSupported }) =>
        Option.contains(maybeIsPlaygroundSupported, false),
      () =>
        messageView(
          'Playground cannot run here',
          'The Playground needs SharedArrayBuffer on a cross-origin isolated page and a working embedded preview. This browser session did not provide that combination. You can still see the example running on its detail page.',
          maybeMeta,
        ),
    ),
    Match.orElse(() =>
      Option.match(Option.all([maybeMeta, maybeFiles]), {
        onNone: () =>
          messageView(
            'Playground coming soon',
            'This example is not yet available in the embedded playground. Open its example detail page to see it running.',
            maybeMeta,
          ),
        onSome: () => responsiveEditorView(model, h),
      }),
    ),
  )

  return h.div(
    [h.Class('flex flex-col h-screen')],
    [
      h.main(
        [
          h.Id('main-content'),
          h.Class('flex-1 flex flex-col min-h-0'),
          h.AriaLabel('Playground'),
        ],
        [content],
      ),
    ],
  )
}

// BLOCK

type PlaygroundArgs = Readonly<{
  maybeIsSupported: Option.Option<boolean>
}>

export class Playground extends Block<Playground, PlaygroundArgs, ViewInputs>()(
  'Playground',
  {
    Model,
    Message,
    Command: [WaitForPlaygroundServerFailure, SchedulePlaygroundFileWrite],
    Mount: [MountPlaygroundEditor],
  },
) {}

export const PlaygroundLive = Playground.make(
  Effect.fn(function* (slug, { maybeIsSupported }) {
    const fileTabs = yield* new PlaygroundFileTabs('fileTabs', {
      id: 'playground-files',
    })
    const files = Option.getOrElse(maybeFilesForSlug(slug), () => ({}))
    const container = yield* new PlaygroundContainer('container', { files })

    const syncContainer = (model: Model): Model => {
      const isRequired = isContainerRequired(model)

      if (isRequired && Option.isNone(model.maybeContainer)) {
        return modifyFields(model, {
          maybeContainer: () => Option.some(container),
        })
      } else if (!isRequired && Option.isSome(model.maybeContainer)) {
        return modifyFields(model, {
          maybeContainer: () => Option.none(),
          state: state =>
            state._tag === 'Failed' ? state : PlaygroundState.Idle(),
        })
      } else {
        return model
      }
    }

    const failPlayground = (model: Model, reason: string) => ({
      model: syncContainer(
        modifyFields(model, {
          state: () => PlaygroundState.Failed({ reason }),
        }),
      ),
    })

    const currentContainer = container.use.pipe(
      Effect.flatMap(({ current }) => current),
      Effect.flatMap(Effect.fromOption),
    )

    return {
      model: syncContainer({
        slug,
        state: PlaygroundState.Booting(),
        files,
        fileTabs,
        activeFilePath: initialActiveFile(files),
        dirtyPaths: [],
        lastWriteError: Option.none(),
        maybeIsSupported,
        maybeContainer: Option.none(),
      }),

      update: {
        InformedOfSupport: (model, { isSupported }) => ({
          model: syncContainer(
            modifyFields(model, {
              maybeIsSupported: () => Option.some(isSupported),
            }),
          ),
        }),
        LoadedPlaygroundPreview: (model, { previewUrl }) => ({
          model: modifyFields(model, {
            state: state => markPreviewLoaded(state, previewUrl),
          }),
        }),
        EditedPlaygroundFile: (model, { path, content }) => {
          const isBooted = model.state._tag === 'Booted'
          const nextModel = modifyFields(model, {
            files: Record.set(path, content),
            dirtyPaths: existing =>
              isBooted ? existing : appendDeduped(existing, path),
          })

          if (isBooted) {
            return {
              model: nextModel,
              commands: [SchedulePlaygroundFileWrite({ path, content })],
            }
          } else {
            return { model: nextModel }
          }
        },
        FailedMountPlaygroundEditor: (model, { reason }) =>
          failPlayground(model, reason),
        SucceededSchedulePlaygroundFileWrite: model => ({
          model: modifyFields(model, { lastWriteError: () => Option.none() }),
        }),
        FailedSchedulePlaygroundFileWrite: (model, { reason }) => ({
          model: modifyFields(model, {
            lastWriteError: () => Option.some(reason),
          }),
        }),
        CompletedWaitForPlaygroundServerFailure: (model, { reason }) =>
          failPlayground(model, reason),
        SucceededMountPlaygroundEditor: model => ({ model }),
        ...container.on({
          Booted: (model, { previewUrl }) => ({
            model: modifyFields(model, {
              state: () =>
                PlaygroundState.Booted({
                  preview: PlaygroundPreview.start(previewUrl),
                }),
              dirtyPaths: () => [],
              lastWriteError: () => Option.none(),
            }),
            commands: [
              WaitForPlaygroundServerFailure(),
              ...flushDirtyPaths(model),
            ],
          }),
          FailedBoot: (model, { reason }) => failPlayground(model, reason),
        }),
        ...fileTabs.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { activeFilePath: () => value }),
          }),
        }),
      },

      commands: {
        WaitForPlaygroundServerFailure: () =>
          currentContainer.pipe(
            Effect.flatMap(({ serverFailure }) =>
              Deferred.await(serverFailure).pipe(
                Effect.catch(error =>
                  Effect.succeed(
                    Message.CompletedWaitForPlaygroundServerFailure({
                      reason: reasonFromError(error),
                    }),
                  ),
                ),
              ),
            ),
            Effect.catchTags({
              NotConnected: () => Effect.interrupt,
              NoSuchElementError: () => Effect.interrupt,
            }),
          ),
        SchedulePlaygroundFileWrite: ({ path, content }) =>
          currentContainer.pipe(
            Effect.flatMap(({ container: webContainer, pendingWrites }) =>
              FiberMap.run(
                pendingWrites,
                path,
                Effect.gen(function* () {
                  yield* Effect.sleep(WRITE_DEBOUNCE_MILLIS)
                  yield* Effect.tryPromise(() =>
                    webContainer.fs.writeFile(path, content),
                  )
                  if (path !== STYLES_CSS_PATH) {
                    const stylesContent = yield* Effect.tryPromise(() =>
                      webContainer.fs.readFile(STYLES_CSS_PATH, 'utf-8'),
                    )
                    yield* Effect.tryPromise(() =>
                      webContainer.fs.writeFile(STYLES_CSS_PATH, stylesContent),
                    )
                  }
                }).pipe(
                  Effect.catch(error =>
                    Effect.logError(
                      `[playground] Debounced write failed for ${path}:`,
                      error,
                    ),
                  ),
                ),
                { startImmediately: true },
              ),
            ),
            Effect.as(Message.SucceededSchedulePlaygroundFileWrite()),
            Effect.catchTags({
              NotConnected: () =>
                Effect.succeed(
                  Message.FailedSchedulePlaygroundFileWrite({
                    reason: 'WebContainer not yet ready',
                  }),
                ),
              NoSuchElementError: () =>
                Effect.succeed(
                  Message.FailedSchedulePlaygroundFileWrite({
                    reason: 'WebContainer not yet ready',
                  }),
                ),
            }),
          ),
      },

      mounts: {
        MountPlaygroundEditor: ({
          element,
          path,
          initialContent,
          files,
          viewStateChanges,
        }) =>
          streamPlaygroundEditorMessages(
            element,
            path,
            initialContent,
            files,
            viewStateChanges,
          ),
      },

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(PlaygroundFileTabs.Live, PlaygroundContainerLive),
  ),
)
