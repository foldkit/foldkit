import type { FileSystemTree, WebContainer } from '@webcontainer/api'
import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Equal,
  Fiber,
  Match as M,
  Option,
  Order,
  Queue,
  Record,
  Schema as S,
  Stream,
  String as String_,
  pipe,
} from 'effect'
import { Command, ManagedResource, Mount, Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import filesBySlug from 'virtual:playground-files'
import playgroundTypes from 'virtual:playground-types'

import { Icon } from '../icon'
import { exampleDetailRouter, examplesRouter } from '../route'
import { type ExampleMeta, findBySlug } from './example/meta'

// MODEL

const PlaygroundStateIdle = ts('PlaygroundStateIdle')
const PlaygroundStateBooting = ts('PlaygroundStateBooting')
const PlaygroundStateBooted = ts('PlaygroundStateBooted', {
  previewUrl: S.String,
})
const PlaygroundStateFailed = ts('PlaygroundStateFailed', {
  reason: S.String,
})

const PlaygroundState = S.Union([
  PlaygroundStateIdle,
  PlaygroundStateBooting,
  PlaygroundStateBooted,
  PlaygroundStateFailed,
])
type PlaygroundState = typeof PlaygroundState.Type

export const Model = S.Struct({
  slug: S.String,
  state: PlaygroundState,
  files: S.Record(S.String, S.String),
  fileTabs: Ui.Tabs.Model,
  // NOTE: Paths edited before the WebContainer finished booting. Writes
  // dispatched at that time fail with `ResourceNotAvailable`, so we
  // accumulate the paths here and flush them once `BootedPlayground`
  // fires.
  dirtyPaths: S.Array(S.String),
  // NOTE: Surfaced as a banner when set. Cleared on `BootedPlayground`
  // and on each successful write schedule, so transient errors don't
  // linger after recovery.
  lastWriteError: S.Option(S.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const BootedPlayground = m('BootedPlayground', {
  previewUrl: S.String,
})
export const FailedBootPlayground = m('FailedBootPlayground', {
  reason: S.String,
})
export const ReleasedPlayground = m('ReleasedPlayground')
export const GotFileTabsMessage = m('GotFileTabsMessage', {
  message: Ui.Tabs.Message,
})
export const EditedPlaygroundFile = m('EditedPlaygroundFile', {
  path: S.String,
  content: S.String,
})
export const SucceededMountPlaygroundEditor = m(
  'SucceededMountPlaygroundEditor',
)
export const FailedMountPlaygroundEditor = m('FailedMountPlaygroundEditor', {
  reason: S.String,
})
export const ScheduledWritePlaygroundFile = m('ScheduledWritePlaygroundFile')
export const FailedWritePlaygroundFile = m('FailedWritePlaygroundFile', {
  reason: S.String,
})

export const Message = S.Union([
  BootedPlayground,
  FailedBootPlayground,
  ReleasedPlayground,
  GotFileTabsMessage,
  EditedPlaygroundFile,
  SucceededMountPlaygroundEditor,
  FailedMountPlaygroundEditor,
  ScheduledWritePlaygroundFile,
  FailedWritePlaygroundFile,
])
export type Message = typeof Message.Type

// INIT

const PREFERRED_INITIAL_FILES: ReadonlyArray<string> = ['src/main.ts']

const maybeFilesForSlug = (
  slug: string,
): Option.Option<Readonly<Record<string, string>>> =>
  pipe(
    filesBySlug,
    Record.get(slug),
    Option.map(entry => entry.files),
  )

const sortedPaths = (
  files: Readonly<Record<string, string>>,
): ReadonlyArray<string> => pipe(files, Record.keys, Array.sort(Order.String))

const initialActiveIndex = (
  files: Readonly<Record<string, string>>,
): number => {
  const paths = sortedPaths(files)
  return pipe(
    PREFERRED_INITIAL_FILES,
    Array.findFirst(preferred => Record.has(files, preferred)),
    Option.flatMap(preferred =>
      Array.findFirstIndex(paths, Equal.equals(preferred)),
    ),
    Option.getOrElse(() => 0),
  )
}

const FILE_TABS_ID = 'playground-files'

export const init = (slug: string): Model => {
  const files = Option.getOrElse(maybeFilesForSlug(slug), () => ({}))
  return {
    slug,
    state: PlaygroundStateBooting(),
    files,
    fileTabs: Ui.Tabs.init({
      id: FILE_TABS_ID,
      activeIndex: initialActiveIndex(files),
    }),
    dirtyPaths: [],
    lastWriteError: Option.none(),
  }
}

// MANAGED RESOURCE

// NOTE: `pendingWrites` is a per-path map of in-flight debounced write
// fibers. A new write for a path interrupts the prior one, so a burst
// of keystrokes collapses to a single fs write + Tailwind HMR nudge per
// path. The map lives on the resource so it gets cleared on release.
const WebContainerPlayground = ManagedResource.tag<{
  container: WebContainer
  previewUrl: string
  pendingWrites: Map<string, Fiber.Fiber<void, never>>
}>()('WebContainerPlayground')

export type WebContainerPlaygroundService = ManagedResource.ServiceOf<
  typeof WebContainerPlayground
>

const PlaygroundParams = S.Struct({ slug: S.String })

const fileSystemTreeFromFiles = (
  files: Readonly<Record<string, string>>,
): FileSystemTree => {
  const tree: FileSystemTree = {}
  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split('/')
    const fileName = segments.pop()
    if (fileName === undefined) {
      continue
    }
    let cursor: FileSystemTree = tree
    for (const segment of segments) {
      const existing = cursor[segment]
      if (existing === undefined) {
        const directory: FileSystemTree = {}
        cursor[segment] = { directory }
        cursor = directory
      } else if ('directory' in existing) {
        cursor = existing.directory
      } else {
        throw new Error(
          `Playground file tree conflict: ${segment} is both a file and a directory`,
        )
      }
    }
    cursor[fileName] = { file: { contents } }
  }
  return tree
}

const reasonFromError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.cause instanceof Error) {
      return `${error.message}: ${error.cause.message}`
    }
    return error.message
  }
  return String(error)
}

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    webContainerPlayground: entry(S.Option(PlaygroundParams), {
      resource: WebContainerPlayground,
      modelToMaybeRequirements: ({ slug }) =>
        pipe(
          slug,
          Option.liftPredicate(() => Record.has(filesBySlug, slug)),
          Option.map(() => ({ slug })),
        ),
      acquire: ({ slug }) =>
        Effect.gen(function* () {
          const fileEntry = yield* Effect.fromOption(
            Record.get(filesBySlug, slug),
          )
          const { WebContainer } = yield* Effect.tryPromise(
            () => import('@webcontainer/api'),
          )
          const container = yield* Effect.tryPromise(() =>
            WebContainer.boot({
              coep: 'credentialless',
              workdirName: 'foldkit',
            }),
          )
          yield* Effect.tryPromise(() =>
            container.mount(fileSystemTreeFromFiles(fileEntry.files)),
          )
          const install = yield* Effect.tryPromise(() =>
            container.spawn('npm', ['install']),
          )
          const installExitCode = yield* Effect.tryPromise(() => install.exit)
          if (installExitCode !== 0) {
            return yield* Effect.fail(
              new Error(`npm install exited with code ${installExitCode}`),
            )
          }
          yield* Effect.tryPromise(() => container.spawn('npm', ['run', 'dev']))
          const previewUrl = yield* Effect.callback<string>(
            (resume, signal) => {
              const unsubscribe = container.on('server-ready', (_port, url) => {
                resume(Effect.succeed(url))
              })
              signal.addEventListener('abort', unsubscribe)
            },
          )
          return {
            container,
            previewUrl,
            pendingWrites: new Map<string, Fiber.Fiber<void, never>>(),
          }
        }),
      release: ({ container, pendingWrites }) =>
        Effect.gen(function* () {
          for (const fiber of pendingWrites.values()) {
            yield* Fiber.interrupt(fiber)
          }
          yield* Effect.sync(() => container.teardown())
        }),
      onAcquired: ({ previewUrl }) => BootedPlayground({ previewUrl }),
      onReleased: () => ReleasedPlayground(),
      onAcquireError: error =>
        FailedBootPlayground({ reason: reasonFromError(error) }),
    }),
  }),
)

// MOUNT

const monacoLanguageForPath = (path: string): string =>
  pipe(
    path,
    String_.lastIndexOf('.'),
    Option.match({
      onNone: () => 'plaintext',
      onSome: dotIndex =>
        M.value(path.slice(dotIndex)).pipe(
          M.when('.ts', () => 'typescript'),
          M.when('.tsx', () => 'typescript'),
          M.when('.js', () => 'javascript'),
          M.when('.html', () => 'html'),
          M.when('.css', () => 'css'),
          M.when('.json', () => 'json'),
          M.orElse(() => 'plaintext'),
        ),
    }),
  )

const monacoUriForPath = (path: string): string => `file:///${path}`

const FOLDKIT_DARK_THEME = 'foldkit-dark'

// NOTE: Hand-port of the docs' `0x96f-dark` Shiki theme to Monaco's
// theme format. Shiki's TextMate scopes don't all have Monaco
// equivalents (Monaco's grammar tokens are coarser), so a few colors
// collapse together. Close enough to feel continuous with the rest of
// the docs.
const defineFoldkitTheme = (monaco: typeof import('monaco-editor')): void => {
  monaco.editor.defineTheme(FOLDKIT_DARK_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8A869C' },
      { token: 'keyword', foreground: 'FF7272' },
      { token: 'string', foreground: 'BCDF59' },
      { token: 'string.escape', foreground: 'A093E2' },
      { token: 'number', foreground: '49CAE4' },
      { token: 'regexp', foreground: 'BCDF59' },
      { token: 'type', foreground: '49CAE4' },
      { token: 'type.identifier', foreground: '49CAE4' },
      { token: 'identifier', foreground: 'FFCA58' },
      { token: 'delimiter', foreground: '9E9BAA' },
      { token: 'tag', foreground: 'BCDF59' },
      { token: 'attribute.name', foreground: 'FFCA58' },
      { token: 'attribute.value', foreground: 'BCDF59' },
    ],
    colors: {
      'editor.background': '#1c1a20',
      'editor.foreground': '#E0DEE6',
    },
  })
}

// NOTE: All operations here are idempotent (`setCompilerOptions`
// overwrites, `addExtraLib` is keyed by path and overwrites). Calling
// this from each mount is wasteful but correct, and avoids the
// module-scoped memoization a `let` would require. The dynamic import
// of `monaco-editor` is cached by the JS module loader, so only the
// `addExtraLib` loop repeats.
const configureMonaco = async () => {
  const monaco = await import('monaco-editor')
  defineFoldkitTheme(monaco)

  // NOTE: Monaco's `ModuleResolutionKind` enum only exposes `Classic`
  // and `NodeJs`, but the bundled TypeScript actually supports newer
  // values. 100 = Bundler in TS, which honors `package.json` `exports`
  // (so `import 'effect/Match'` resolves to the wildcard export) and
  // avoids the postMessage-clone bug that `NodeJs` triggers in this
  // Monaco version. The cast is required because the enum type narrows
  // what `moduleResolution` accepts; the runtime accepts any valid TS
  // `ModuleResolutionKind` integer.
  const bundlerModuleResolution =
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    100 as typeof monaco.typescript.ModuleResolutionKind.Classic

  const tsDefaults = monaco.typescript.typescriptDefaults
  tsDefaults.setCompilerOptions({
    target: monaco.typescript.ScriptTarget.ESNext,
    module: monaco.typescript.ModuleKind.ESNext,
    moduleResolution: bundlerModuleResolution,
    strict: true,
    exactOptionalPropertyTypes: true,
    noImplicitOverride: true,
    noUncheckedIndexedAccess: true,
    isolatedModules: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    // NOTE: `noEmit` + `allowImportingTsExtensions` together unlock
    // Bundler's auto-resolution of `.ts` extensions for relative
    // imports. Without these flags, Monaco's Bundler will not match
    // `./ui/message` against our model at `file:///src/ui/message.ts`,
    // even though the model exists.
    noEmit: true,
    allowImportingTsExtensions: true,
    jsx: monaco.typescript.JsxEmit.Preserve,
  })
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })
  for (const { path, contents } of playgroundTypes) {
    tsDefaults.addExtraLib(contents, `file://${path}`)
  }
}

const PlaygroundEditor = Mount.defineStream(
  'PlaygroundEditor',
  {
    path: S.String,
    initialContent: S.String,
    files: S.Record(S.String, S.String),
  },
  SucceededMountPlaygroundEditor,
  FailedMountPlaygroundEditor,
  EditedPlaygroundFile,
)(
  ({ path, initialContent, files }) =>
    element =>
      Stream.callback<
        | typeof SucceededMountPlaygroundEditor.Type
        | typeof FailedMountPlaygroundEditor.Type
        | typeof EditedPlaygroundFile.Type
      >(queue =>
        Effect.acquireRelease(
          Effect.tryPromise(async () => {
            await configureMonaco()
            const monaco = await import('monaco-editor')
            if (!(element instanceof HTMLElement)) {
              throw new Error('Playground editor host must be an HTMLElement')
            }
            // NOTE: Pre-create Monaco models for every example file so
            // relative imports between them resolve. Without this, opening
            // `src/main.ts` and `import './icon'` would fail since
            // Monaco's TS service only sees the files it has models for.
            //
            // We also register each TypeScript file as an extraLib. Monaco's
            // TS service uses different code paths for resolving against
            // models vs extraLibs, and Bundler's extension auto-resolution
            // only kicks in for extraLib paths. Without this, relative
            // imports like `./ui/message` fail to resolve to the model at
            // `file:///src/ui/message.ts` despite the model existing.
            const tsDefaults = monaco.typescript.typescriptDefaults
            for (const [siblingPath, siblingContent] of Object.entries(files)) {
              const siblingUri = monaco.Uri.parse(monacoUriForPath(siblingPath))
              if (monaco.editor.getModel(siblingUri) === null) {
                monaco.editor.createModel(
                  siblingContent,
                  monacoLanguageForPath(siblingPath),
                  siblingUri,
                )
              }
              if (monacoLanguageForPath(siblingPath) === 'typescript') {
                tsDefaults.addExtraLib(siblingContent, siblingUri.toString())
              }
            }
            const uri = monaco.Uri.parse(monacoUriForPath(path))
            const editorModel =
              monaco.editor.getModel(uri) ??
              monaco.editor.createModel(
                initialContent,
                monacoLanguageForPath(path),
                uri,
              )
            const editor = monaco.editor.create(element, {
              model: editorModel,
              theme: FOLDKIT_DARK_THEME,
              automaticLayout: true,
              fontSize: 13,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              scrollbar: { alwaysConsumeMouseWheel: false },
              stickyScroll: { enabled: false },
              contextmenu: false,
              autoClosingQuotes: 'never',
              glyphMargin: false,
              // NOTE: Monaco 0.55 ships an experimental `EditContext`
              // input path that supersedes the hidden textarea. In our
              // cross-origin-isolated playground page the EditContext
              // path silently drops `Cmd+C` copies of selected text.
              // Forcing the textarea path restores standard clipboard
              // behavior at the cost of opting out of an in-progress
              // browser API.
              editContext: false,
            })
            const changeSubscription = editorModel.onDidChangeContent(() => {
              Queue.offerUnsafe(
                queue,
                EditedPlaygroundFile({
                  path,
                  content: editorModel.getValue(),
                }),
              )
            })
            Queue.offerUnsafe(queue, SucceededMountPlaygroundEditor())
            return { editor, editorModel, changeSubscription }
          }),
          ({ editor, editorModel, changeSubscription }) =>
            Effect.sync(() => {
              changeSubscription.dispose()
              editor.dispose()
              editorModel.dispose()
            }),
        ).pipe(
          Effect.flatMap(() => Effect.never),
          Effect.catch(error =>
            Effect.sync(() => {
              Queue.offerUnsafe(
                queue,
                FailedMountPlaygroundEditor({
                  reason: reasonFromError(error),
                }),
              )
            }),
          ),
        ),
      ),
)

// COMMAND

// NOTE: Vite's HMR for a content file (`src/main.ts`) doesn't reliably
// invalidate Tailwind's CSS module in the WebContainer. After writing the
// content file, we write `src/styles.css` back to itself so Vite emits a
// CSS HMR update; that re-runs the Tailwind plugin against the latest
// content tree and the new utility classes show up in the preview.
const STYLES_CSS_PATH = 'src/styles.css'

const WRITE_DEBOUNCE_MILLIS = 250

export const WritePlaygroundFile = Command.define(
  'WritePlaygroundFile',
  { path: S.String, content: S.String },
  ScheduledWritePlaygroundFile,
  FailedWritePlaygroundFile,
)(({ path, content }) =>
  Effect.gen(function* () {
    const { container, pendingWrites } = yield* WebContainerPlayground.get
    const existing = pendingWrites.get(path)
    if (existing !== undefined) {
      yield* Fiber.interrupt(existing)
    }
    const fiber = yield* pipe(
      Effect.gen(function* () {
        yield* Effect.sleep(WRITE_DEBOUNCE_MILLIS)
        yield* Effect.tryPromise(() => container.fs.writeFile(path, content))
        if (path !== STYLES_CSS_PATH) {
          const stylesContent = yield* Effect.tryPromise(() =>
            container.fs.readFile(STYLES_CSS_PATH, 'utf-8'),
          )
          yield* Effect.tryPromise(() =>
            container.fs.writeFile(STYLES_CSS_PATH, stylesContent),
          )
        }
        pendingWrites.delete(path)
      }),
      // NOTE: Errors in the debounced write fiber can't reach the parent
      // Command's return value (the Command already returned
      // `Scheduled…` synchronously). We log so dev failures aren't
      // entirely invisible; a Tailwind/HMR storm or container crash
      // will appear in the console.
      Effect.catch(error =>
        Effect.sync(() => {
          console.error(
            `[playground] Debounced write failed for ${path}:`,
            error,
          )
        }),
      ),
      Effect.forkDetach,
    )
    pendingWrites.set(path, fiber)
    return ScheduledWritePlaygroundFile()
  }).pipe(
    Effect.catchTag('ResourceNotAvailable', () =>
      Effect.succeed(
        FailedWritePlaygroundFile({ reason: 'WebContainer not yet ready' }),
      ),
    ),
    Effect.catch(error =>
      Effect.succeed(
        FailedWritePlaygroundFile({ reason: reasonFromError(error) }),
      ),
    ),
  ),
)

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, WebContainerPlaygroundService>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const appendDeduped = (
  paths: ReadonlyArray<string>,
  path: string,
): ReadonlyArray<string> =>
  Array.contains(paths, path) ? paths : [...paths, path]

const flushDirtyPaths = (
  model: Model,
): ReadonlyArray<
  Command.Command<Message, never, WebContainerPlaygroundService>
> =>
  model.dirtyPaths.flatMap(path =>
    pipe(
      Record.get(model.files, path),
      Option.map(content => WritePlaygroundFile({ path, content })),
      Option.toArray,
    ),
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tags({
      BootedPlayground: ({ previewUrl }) => [
        evo(model, {
          state: () => PlaygroundStateBooted({ previewUrl }),
          dirtyPaths: () => [],
          lastWriteError: () => Option.none(),
        }),
        flushDirtyPaths(model),
      ],
      FailedBootPlayground: ({ reason }) => [
        evo(model, { state: () => PlaygroundStateFailed({ reason }) }),
        [],
      ],
      ReleasedPlayground: () => [
        evo(model, { state: () => PlaygroundStateIdle() }),
        [],
      ],
      GotFileTabsMessage: ({ message: tabsMessage }) => {
        const [nextTabs, tabsCommands] = PlaygroundFileTabs.update(
          model.fileTabs,
          tabsMessage,
        )
        return [
          evo(model, { fileTabs: () => nextTabs }),
          Command.mapMessages(tabsCommands, message =>
            GotFileTabsMessage({ message }),
          ),
        ]
      },
      EditedPlaygroundFile: ({ path, content }) => {
        const isBooted = model.state._tag === 'PlaygroundStateBooted'
        return [
          evo(model, {
            files: Record.set(path, content),
            dirtyPaths: existing =>
              isBooted ? existing : appendDeduped(existing, path),
          }),
          isBooted ? [WritePlaygroundFile({ path, content })] : [],
        ]
      },
      FailedMountPlaygroundEditor: ({ reason }) => [
        evo(model, { state: () => PlaygroundStateFailed({ reason }) }),
        [],
      ],
      ScheduledWritePlaygroundFile: () => [
        evo(model, { lastWriteError: () => Option.none() }),
        [],
      ],
      FailedWritePlaygroundFile: ({ reason }) => [
        evo(model, { lastWriteError: () => Option.some(reason) }),
        [],
      ],
    }),
    M.tag('SucceededMountPlaygroundEditor', () => [model, []]),
    M.exhaustive,
  )

// VIEW

const FILE_TAB_BUTTON_BASE_CLASS =
  'block w-full text-left px-3 py-1.5 font-mono text-xs'

const fileTabButtonClassName = clsx(
  FILE_TAB_BUTTON_BASE_CLASS,
  'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
  'data-[selected]:bg-gray-200 data-[selected]:dark:bg-gray-800 data-[selected]:text-gray-900 data-[selected]:dark:text-gray-100 hover:cursor-pointer',
)

const backToExampleButton = (maybeMeta: Option.Option<ExampleMeta>): Html => {
  const h = html()

  return Option.match(maybeMeta, {
    onNone: () =>
      h.a(
        [h.Href(examplesRouter()), h.Class('cta-secondary')],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
    onSome: meta =>
      h.a(
        [
          h.Href(exampleDetailRouter({ exampleSlug: meta.slug })),
          h.Class('cta-secondary'),
        ],
        [Icon.chevronLeft('w-4 h-4'), `Back to ${meta.title}`],
      ),
  })
}

const messageView = (
  heading: string,
  body: string,
  maybeMeta: Option.Option<ExampleMeta>,
): Html => {
  const h = html()

  return h.div(
    [h.Class('flex-1 flex items-center justify-center px-6 py-20 text-center')],
    [
      h.div(
        [h.Class('max-w-md flex flex-col items-center')],
        [
          h.div(
            [
              h.Class(
                'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
              ),
            ],
            [heading],
          ),
          h.div(
            [h.Class('text-sm text-gray-600 dark:text-gray-400 mb-6')],
            [body],
          ),
          backToExampleButton(maybeMeta),
        ],
      ),
    ],
  )
}

const spinnerView = (): Html => {
  const h = html()
  return h.div(
    [
      h.Class(
        'w-8 h-8 mb-6 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 animate-spin',
      ),
      h.AriaLabel('Loading'),
      h.Role('status'),
    ],
    [],
  )
}

const bootingPanelView = (heading: string, body: string): Html => {
  const h = html()
  return h.div(
    [h.Class('flex-1 flex items-center justify-center px-6 py-20 text-center')],
    [
      h.div(
        [h.Class('max-w-sm flex flex-col items-center')],
        [
          spinnerView(),
          h.div(
            [h.Class('text-base font-semibold text-gray-900 mb-2')],
            [heading],
          ),
          h.div([h.Class('text-sm text-gray-600')], [body]),
        ],
      ),
    ],
  )
}

const failurePanelView = (reason: string): Html => {
  const h = html()
  return h.div(
    [h.Class('flex-1 flex items-center justify-center px-6 py-20 text-center')],
    [
      h.div(
        [h.Class('max-w-sm flex flex-col items-center')],
        [
          h.div(
            [h.Class('text-base font-semibold text-gray-900 mb-2')],
            ['Playground failed to load'],
          ),
          h.div([h.Class('text-sm text-gray-600')], [reason]),
        ],
      ),
    ],
  )
}

const editorPanelContent = (
  path: string,
  content: string,
  files: Readonly<Record<string, string>>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex-1 min-w-0 min-h-0 flex flex-col bg-[#1e1e1e] text-sm')],
    [
      h.keyed('div')(
        `editor-${path}`,
        [
          h.Class('flex-1 min-h-0 min-w-0 overflow-hidden'),
          h.OnMount(PlaygroundEditor({ path, initialContent: content, files })),
        ],
        [],
      ),
    ],
  )
}

const previewPaneView = (state: PlaygroundState): Html => {
  const h = html()

  return h.div(
    [
      h.Class(
        'flex-1 min-w-0 min-h-0 flex flex-col border-l max-playground-wide:border-l-0 max-playground-wide:border-t border-gray-200 dark:border-gray-800 bg-white',
      ),
    ],
    [
      h.keyed('div')(
        state._tag,
        [h.Class('flex-1 min-w-0 min-h-0 flex flex-col')],
        [
          M.value(state).pipe(
            M.tagsExhaustive({
              PlaygroundStateIdle: () =>
                bootingPanelView(
                  'Starting playground…',
                  'Hang tight. The preview will appear automatically.',
                ),
              PlaygroundStateBooting: () =>
                bootingPanelView(
                  'Starting playground…',
                  'Hang tight. The preview will appear automatically. First load takes about 30 seconds.',
                ),
              PlaygroundStateBooted: ({ previewUrl }) =>
                h.iframe(
                  [
                    h.Src(previewUrl),
                    h.Allow('cross-origin-isolated'),
                    h.Class('w-full h-full border-0'),
                    h.Title('Foldkit Playground'),
                  ],
                  [],
                ),
              PlaygroundStateFailed: ({ reason }) => failurePanelView(reason),
            }),
          ),
        ],
      ),
    ],
  )
}

const writeErrorBannerView = (maybeError: Option.Option<string>): Html => {
  const h = html()
  return Option.match(maybeError, {
    onNone: () => h.div([h.Class('hidden')], []),
    onSome: reason =>
      h.div(
        [
          h.Class(
            'shrink-0 px-4 py-2 text-xs border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-200',
          ),
          h.Role('alert'),
        ],
        [`Playground write failed: ${reason}`],
      ),
  })
}

const tooNarrowMessageView = (): Html => {
  const h = html()
  return h.div(
    [
      h.Class(
        'flex-1 hidden max-md:flex items-center justify-center px-6 py-20 text-center',
      ),
    ],
    [
      h.div(
        [h.Class('max-w-md flex flex-col items-center')],
        [
          h.div(
            [
              h.Class(
                'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
              ),
            ],
            ['Playground needs a wider screen'],
          ),
          h.div(
            [h.Class('text-sm text-gray-600 dark:text-gray-400')],
            ['The live editor + preview layout needs a wider screen.'],
          ),
        ],
      ),
    ],
  )
}

const responsiveEditorView = (model: Model): Html => {
  const h = html<Message>()
  return h.div(
    [h.Class('flex-1 min-h-0 flex flex-col')],
    [
      tooNarrowMessageView(),
      h.div(
        [h.Class('flex-1 min-h-0 min-w-0 flex max-md:hidden')],
        [editorLayoutView(model)],
      ),
    ],
  )
}

const PlaygroundFileTabs = Ui.Tabs.create<string>()

const editorLayoutView = (model: Model): Html => {
  const h = html<Message>()
  const paths = sortedPaths(model.files)
  return h.div(
    [h.Class('flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden')],
    [
      writeErrorBannerView(model.lastWriteError),
      h.div(
        [h.Class('flex-1 min-h-0 min-w-0 flex max-playground-wide:flex-col')],
        [
          h.submodel({
            slotId: model.fileTabs.id,
            model: model.fileTabs,
            view: PlaygroundFileTabs.view,
            viewInputs: {
              tabs: paths,
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
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
            },
            toParentMessage: message => GotFileTabsMessage({ message }),
          }),
          previewPaneView(model.state),
        ],
      ),
    ],
  )
}

type ViewInputs = Readonly<{ isChromium: boolean }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { isChromium }): Html => {
    const h = html<Message>()

    const maybeMeta = findBySlug(model.slug)
    const maybeFiles = Option.fromNullishOr(filesBySlug[model.slug])

    const content = M.value({ isChromium, maybeMeta, maybeFiles }).pipe(
      M.when(
        ({ isChromium }) => !isChromium,
        () =>
          messageView(
            'Playground requires a Chromium browser',
            'The editable playground runs on WebContainers, which requires Chrome, Edge, Brave, or another Chromium-based browser. You can still see the example running on its detail page.',
            maybeMeta,
          ),
      ),
      M.orElse(() =>
        Option.match(Option.all([maybeMeta, maybeFiles]), {
          onNone: () =>
            messageView(
              'Playground coming soon',
              'This example is not yet available in the embedded playground. Open its example detail page to see it running.',
              maybeMeta,
            ),
          onSome: () => responsiveEditorView(model),
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
