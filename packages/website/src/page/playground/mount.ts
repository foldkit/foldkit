import {
  Effect,
  Match,
  Option,
  Queue,
  Schema,
  Stream,
  String,
  pipe,
} from 'effect'
import type { Mount } from 'foldkit'

import { reasonFromError } from '../playgroundWebContainer'
import {
  type EditedPlaygroundFile,
  type FailedMountPlaygroundEditor,
  Message,
  PlaygroundDefinition,
  type SucceededMountPlaygroundEditor,
} from './definition'

const monacoLanguageForPath = (path: string): string =>
  pipe(
    path,
    String.lastIndexOf('.'),
    Option.match({
      onNone: () => 'plaintext',
      onSome: dotIndex =>
        Match.value(path.slice(dotIndex)).pipe(
          Match.when('.ts', () => 'typescript'),
          Match.when('.tsx', () => 'typescript'),
          Match.when('.js', () => 'javascript'),
          Match.when('.html', () => 'html'),
          Match.when('.css', () => 'css'),
          Match.when('.json', () => 'json'),
          Match.orElse(() => 'plaintext'),
        ),
    }),
  )

const monacoUriForPath = (path: string): string => `file:///${path}`

const FOLDKIT_DARK_THEME = 'foldkit-dark'

// NOTE: Hand-port of the docs' `github-dark-default` Shiki theme to Monaco's
// theme format. Shiki's TextMate scopes don't all have Monaco
// equivalents (Monaco's grammar tokens are coarser), so a few colors
// collapse together. Close enough to feel continuous with the rest of
// the docs.
const defineFoldkitTheme = (monaco: typeof import('monaco-editor')): void => {
  monaco.editor.defineTheme(FOLDKIT_DARK_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8B949E' },
      { token: 'keyword', foreground: 'FF7B72' },
      { token: 'string', foreground: 'A5D6FF' },
      { token: 'string.escape', foreground: '79C0FF' },
      { token: 'number', foreground: '79C0FF' },
      { token: 'regexp', foreground: '7EE787' },
      { token: 'type', foreground: 'FFA657' },
      { token: 'type.identifier', foreground: 'FFA657' },
      { token: 'identifier', foreground: 'E6EDF3' },
      { token: 'delimiter', foreground: 'E6EDF3' },
      { token: 'tag', foreground: '7EE787' },
      { token: 'attribute.name', foreground: '79C0FF' },
      { token: 'attribute.value', foreground: 'A5D6FF' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#E6EDF3',
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
  const [monaco, { default: playgroundTypes }] = await Promise.all([
    import('monaco-editor'),
    import('virtual:playground-types'),
  ])
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

type PlaygroundEditorMessage =
  | SucceededMountPlaygroundEditor
  | FailedMountPlaygroundEditor
  | EditedPlaygroundFile

type PlaygroundEditorResource = Readonly<{
  editor: import('monaco-editor').editor.IStandaloneCodeEditor
  editorModel: import('monaco-editor').editor.ITextModel
  changeSubscription: import('monaco-editor').IDisposable
}>

const registerPlaygroundModels = (
  monaco: typeof import('monaco-editor'),
  files: Readonly<Record<string, string>>,
): void => {
  // NOTE: Pre-create Monaco models for every example file so relative imports
  // between them resolve. Without this, opening `src/application.ts` and
  // `import './icon'` would fail since Monaco's TS service only sees the files
  // it has models for.
  //
  // We also register each TypeScript file as an extraLib. Monaco's TS service
  // uses different code paths for resolving against models vs extraLibs, and
  // Bundler's extension auto-resolution only kicks in for extraLib paths.
  // Without this, relative imports like `./ui/message` fail to resolve to the
  // model at `file:///src/ui/message.ts` despite the model existing.
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
}

const acquirePlaygroundEditor = <E>(
  queue: Queue.Enqueue<PlaygroundEditorMessage, E>,
  element: Element,
  path: string,
  initialContent: string,
  files: Readonly<Record<string, string>>,
) =>
  Effect.tryPromise(async (): Promise<PlaygroundEditorResource> => {
    await configureMonaco()
    const monaco = await import('monaco-editor')

    if (!(element instanceof HTMLElement)) {
      throw new Error('Playground editor host must be an HTMLElement')
    }

    registerPlaygroundModels(monaco, files)

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
      fontFamily: 'Paper Mono, ui-monospace, monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      scrollbar: { alwaysConsumeMouseWheel: false },
      stickyScroll: { enabled: false },
      contextmenu: false,
      autoClosingQuotes: 'never',
      glyphMargin: false,
      // NOTE: Monaco 0.55 ships an experimental `EditContext` input path that
      // supersedes the hidden textarea. In our cross-origin-isolated playground
      // page the EditContext path silently drops `Cmd+C` copies of selected
      // text. Forcing the textarea path restores standard clipboard behavior at
      // the cost of opting out of an in-progress browser API.
      editContext: false,
    })

    const changeSubscription = editorModel.onDidChangeContent(() => {
      Queue.offerUnsafe(
        queue,
        Message.EditedPlaygroundFile({
          path,
          content: editorModel.getValue(),
        }),
      )
    })

    Queue.offerUnsafe(queue, Message.SucceededMountPlaygroundEditor())
    return { editor, editorModel, changeSubscription }
  })

const releasePlaygroundEditor = (resource: PlaygroundEditorResource) =>
  Effect.sync(() => {
    resource.changeSubscription.dispose()
    resource.editor.dispose()
    resource.editorModel.dispose()
  })

const streamPlaygroundEditorMessages = (
  element: Element,
  path: string,
  initialContent: string,
  files: Readonly<Record<string, string>>,
  viewStateChanges: Stream.Stream<Mount.ViewState>,
) =>
  Stream.callback<PlaygroundEditorMessage>(queue =>
    Effect.acquireRelease(
      acquirePlaygroundEditor(queue, element, path, initialContent, files),
      releasePlaygroundEditor,
    ).pipe(
      Effect.flatMap(({ editor }) =>
        viewStateChanges.pipe(
          Stream.runForEach(viewState =>
            Effect.sync(() =>
              editor.updateOptions({ readOnly: viewState === 'Paused' }),
            ),
          ),
        ),
      ),
      Effect.catch(error =>
        Effect.sync(() => {
          Queue.offerUnsafe(
            queue,
            Message.FailedMountPlaygroundEditor({
              reason: reasonFromError(error),
            }),
          )
        }),
      ),
    ),
  )

export const MountPlaygroundEditor = PlaygroundDefinition.makeMountStream(
  'MountPlaygroundEditor',
  {
    args: {
      path: Schema.String,
      initialContent: Schema.String,
      files: Schema.Record(Schema.String, Schema.String),
    },
    messages: [
      Message.SucceededMountPlaygroundEditor,
      Message.FailedMountPlaygroundEditor,
      Message.EditedPlaygroundFile,
    ],
    handler: function* () {
      return ({ element, path, initialContent, files, viewStateChanges }) =>
        streamPlaygroundEditorMessages(
          element,
          path,
          initialContent,
          files,
          viewStateChanges,
        )
    },
  },
)
