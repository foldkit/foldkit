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
import { ManagedResource } from 'foldkit'
import { Html, inertHtml as ih } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'
import filesBySlug from 'virtual:playground-files'

import { Icon } from '../../icon'
import { exampleDetailRouter, examplesRouter } from '../../route'
import { type ExampleMeta, findBySlug } from '../example/meta'
import * as PlaygroundPreview from '../playgroundPreview'
import {
  type PlaygroundWebContainer,
  acquirePlaygroundWebContainer,
  reasonFromError,
} from '../playgroundWebContainer'
import {
  FileTabsBinding,
  PlaygroundComposition,
  type PlaygroundViewBuilder,
} from './composition'
import {
  Message,
  Model,
  PlaygroundDefinition,
  PlaygroundState,
  makeFieldsStep,
  makeNoopStep,
} from './definition'
import { MountPlaygroundEditor } from './mount'

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

export const init = PlaygroundComposition.makeInit(
  (slug: string, maybeIsSupported: Option.Option<boolean> = Option.none()) => {
    const files = Option.getOrElse(maybeFilesForSlug(slug), () => ({}))

    return {
      model: {
        slug,
        state: PlaygroundState.Booting(),
        files,
        activeFilePath: initialActiveFile(files),
        dirtyPaths: [],
        lastWriteError: Option.none(),
        maybeIsSupported,
      },
    }
  },
)

// MANAGED RESOURCE

const WebContainerPlayground =
  PlaygroundDefinition.makeResource<PlaygroundWebContainer>()(
    'WebContainerPlayground',
  )

export type WebContainerPlaygroundService = ManagedResource.ServiceOf<
  typeof WebContainerPlayground
>

const PlaygroundParams = Schema.Struct({ slug: Schema.String })
type PlaygroundParams = typeof PlaygroundParams.Type
// NOTE: Vite's HMR for a content file (`src/application.ts`) doesn't reliably
// invalidate Tailwind's CSS module in the WebContainer. After writing the
// content file, we write `src/styles.css` back to itself so Vite emits a
// CSS HMR update; that re-runs the Tailwind plugin against the latest
// content tree and the new utility classes show up in the preview.
const STYLES_CSS_PATH = 'src/styles.css'

const WRITE_DEBOUNCE_MILLIS = 250

export const WaitForPlaygroundServerFailure = PlaygroundDefinition.makeCommand(
  'WaitForPlaygroundServerFailure',
  {
    messages: [Message.CompletedWaitForPlaygroundServerFailure],
    handler: function* () {
      return () =>
        Effect.gen(function* () {
          const { serverFailure } = yield* WebContainerPlayground.get
          return yield* Deferred.await(serverFailure).pipe(
            Effect.catch(error =>
              Effect.succeed(
                Message.CompletedWaitForPlaygroundServerFailure({
                  reason: reasonFromError(error),
                }),
              ),
            ),
          )
        }).pipe(Effect.catchTag('ResourceNotAvailable', () => Effect.interrupt))
    },
  },
)

export const SchedulePlaygroundFileWrite = PlaygroundDefinition.makeCommand(
  'SchedulePlaygroundFileWrite',
  {
    args: { path: Schema.String, content: Schema.String },
    messages: [
      Message.SucceededSchedulePlaygroundFileWrite,
      Message.FailedSchedulePlaygroundFileWrite,
    ],
    handler: function* () {
      return ({ path, content }) =>
        Effect.gen(function* () {
          const { container, pendingWrites } = yield* WebContainerPlayground.get
          yield* FiberMap.run(
            pendingWrites,
            path,
            Effect.gen(function* () {
              yield* Effect.sleep(WRITE_DEBOUNCE_MILLIS)
              yield* Effect.tryPromise(() =>
                container.fs.writeFile(path, content),
              )
              if (path !== STYLES_CSS_PATH) {
                const stylesContent = yield* Effect.tryPromise(() =>
                  container.fs.readFile(STYLES_CSS_PATH, 'utf-8'),
                )
                yield* Effect.tryPromise(() =>
                  container.fs.writeFile(STYLES_CSS_PATH, stylesContent),
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
          )
          return Message.SucceededSchedulePlaygroundFileWrite()
        }).pipe(
          Effect.catchTag('ResourceNotAvailable', () =>
            Effect.succeed(
              Message.FailedSchedulePlaygroundFileWrite({
                reason: 'WebContainer not yet ready',
              }),
            ),
          ),
        )
    },
  },
)

export const managedResources = PlaygroundDefinition.makeManagedResources(
  entry => ({
    webContainerPlayground: entry(
      'ManageWebContainerPlayground',
      Schema.Option(PlaygroundParams),
      {
        resource: WebContainerPlayground,
        modelToMaybeRequirements: ({ slug, state, maybeIsSupported }) =>
          state._tag === 'Failed' ||
          state._tag === 'Idle' ||
          !Option.contains(maybeIsSupported, true)
            ? Option.none()
            : pipe(
                slug,
                Option.liftPredicate(() => Record.has(filesBySlug, slug)),
                Option.map(() => ({ slug })),
              ),
        onAcquired: ({ previewUrl }) =>
          Message.BootedPlayground({ previewUrl }),
        onReleased: () => Message.ReleasedPlayground(),
        onAcquireError: error =>
          Message.FailedBootPlayground({ reason: reasonFromError(error) }),
        handler: function* () {
          return {
            acquire: ({ slug }) =>
              Effect.gen(function* () {
                const fileEntry = yield* Effect.fromOption(
                  Record.get(filesBySlug, slug),
                )
                return yield* acquirePlaygroundWebContainer(fileEntry.files)
              }),
            release: () => Effect.void,
          }
        },
      },
    ),
  }),
)

export const EffectsLayer = Layer.mergeAll(
  managedResources.layer,
  MountPlaygroundEditor.layer,
  WaitForPlaygroundServerFailure.layer,
  SchedulePlaygroundFileWrite.layer,
)

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

export const update = PlaygroundComposition.makeUpdate({
  InformedOfSupport: makeFieldsStep.fromMessage(({ isSupported }) => ({
    maybeIsSupported: () => Option.some(isSupported),
  })),
  BootedPlayground: (model, { previewUrl }) => ({
    model: modifyFields(model, {
      state: () =>
        PlaygroundState.Booted({
          preview: PlaygroundPreview.start(previewUrl),
        }),
      dirtyPaths: () => [],
      lastWriteError: () => Option.none(),
    }),
    commands: [WaitForPlaygroundServerFailure(), ...flushDirtyPaths(model)],
  }),
  FailedBootPlayground: makeFieldsStep.fromMessage(({ reason }) => ({
    state: () => PlaygroundState.Failed({ reason }),
  })),
  ReleasedPlayground: makeFieldsStep(() => ({
    state: state => (state._tag === 'Failed' ? state : PlaygroundState.Idle()),
  })),
  LoadedPlaygroundPreview: makeFieldsStep.fromMessage(({ previewUrl }) => ({
    state: state => markPreviewLoaded(state, previewUrl),
  })),
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
  FailedMountPlaygroundEditor: makeFieldsStep.fromMessage(({ reason }) => ({
    state: () => PlaygroundState.Failed({ reason }),
  })),
  SucceededSchedulePlaygroundFileWrite: makeFieldsStep(() => ({
    lastWriteError: () => Option.none(),
  })),
  FailedSchedulePlaygroundFileWrite: makeFieldsStep.fromMessage(
    ({ reason }) => ({
      lastWriteError: () => Option.some(reason),
    }),
  ),
  CompletedWaitForPlaygroundServerFailure: makeFieldsStep.fromMessage(
    ({ reason }) => ({
      state: () => PlaygroundState.Failed({ reason }),
    }),
  ),
  SucceededMountPlaygroundEditor: makeNoopStep(),
})

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
          h.block(
            FileTabsBinding.embedView({
              slotId: model.fileTabs.id,
              model: model.fileTabs,
              viewInputs: {
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
              },
            }),
          ),
          previewPaneView(model.state, h),
        ],
      ),
    ],
  )
}

type ViewInputs = Readonly<{
  maybeIsPlaygroundSupported: Option.Option<boolean>
}>

export const view = PlaygroundComposition.makeView.withInputs<ViewInputs>(
  (model, { maybeIsPlaygroundSupported }, h) => {
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
  },
)
