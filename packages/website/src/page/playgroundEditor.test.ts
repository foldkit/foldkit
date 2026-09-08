import { Deferred, Effect, PubSub, Stream } from 'effect'
import { Mount } from 'foldkit'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { PlaygroundEditor } from './playground'

const monaco = vi.hoisted(() => ({
  addExtraLib: vi.fn(),
  changeSubscriptionDispose: vi.fn(),
  createEditor: vi.fn(),
  createModel: vi.fn(),
  defineTheme: vi.fn(),
  editorDispose: vi.fn(),
  editorModelDispose: vi.fn(),
  setCompilerOptions: vi.fn(),
  setDiagnosticsOptions: vi.fn(),
  updateOptions: vi.fn(),
}))

vi.mock('monaco-editor', () => {
  const editorModel = {
    dispose: monaco.editorModelDispose,
    getValue: () => 'initial content',
    onDidChangeContent: () => ({ dispose: monaco.changeSubscriptionDispose }),
  }
  const editor = {
    dispose: monaco.editorDispose,
    updateOptions: monaco.updateOptions,
  }

  monaco.createEditor.mockReturnValue(editor)
  monaco.createModel.mockReturnValue(editorModel)

  return {
    Uri: { parse: (value: string) => ({ toString: () => value }) },
    editor: {
      create: monaco.createEditor,
      createModel: monaco.createModel,
      defineTheme: monaco.defineTheme,
      getModel: () => null,
    },
    typescript: {
      JsxEmit: { Preserve: 1 },
      ModuleKind: { ESNext: 1 },
      ModuleResolutionKind: { Classic: 1 },
      ScriptTarget: { ESNext: 1 },
      typescriptDefaults: {
        addExtraLib: monaco.addExtraLib,
        setCompilerOptions: monaco.setCompilerOptions,
        setDiagnosticsOptions: monaco.setDiagnosticsOptions,
      },
    },
  }
})

describe('PlaygroundEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('keeps its Monaco instance and follows the rendered view state', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const observedInitialLive = yield* Deferred.make<void>()
          const observedPaused = yield* Deferred.make<void>()
          const observedResumed = yield* Deferred.make<void>()
          monaco.updateOptions.mockImplementation(() => {
            if (monaco.updateOptions.mock.calls.length === 1) {
              Effect.runSync(Deferred.succeed(observedInitialLive, undefined))
            } else if (monaco.updateOptions.mock.calls.length === 2) {
              Effect.runSync(Deferred.succeed(observedPaused, undefined))
            } else if (monaco.updateOptions.mock.calls.length === 3) {
              Effect.runSync(Deferred.succeed(observedResumed, undefined))
            }
          })

          const viewStates = yield* PubSub.unbounded<Mount.ViewState>({
            replay: 1,
          })
          yield* PubSub.publish(viewStates, Mount.ViewState.make('Live'))
          yield* PlaygroundEditor({
            path: 'src/main.ts',
            initialContent: 'initial content',
            files: {},
          })
            .f(document.createElement('div'), Stream.fromPubSub(viewStates))
            .pipe(Stream.runDrain, Effect.forkScoped)

          yield* Deferred.await(observedInitialLive)
          expect(monaco.createEditor).toHaveBeenCalledOnce()
          expect(monaco.editorDispose).not.toHaveBeenCalled()

          yield* PubSub.publish(viewStates, Mount.ViewState.make('Paused'))
          yield* Deferred.await(observedPaused)
          expect(monaco.createEditor).toHaveBeenCalledOnce()
          expect(monaco.updateOptions).toHaveBeenLastCalledWith({
            readOnly: true,
          })
          expect(monaco.editorDispose).not.toHaveBeenCalled()

          yield* PubSub.publish(viewStates, Mount.ViewState.make('Live'))
          yield* Deferred.await(observedResumed)
          expect(monaco.createEditor).toHaveBeenCalledOnce()
          expect(monaco.updateOptions).toHaveBeenLastCalledWith({
            readOnly: false,
          })
        }),
      ),
    )

    expect(monaco.createEditor).toHaveBeenCalledOnce()
    expect(monaco.updateOptions.mock.calls).toEqual([
      [{ readOnly: false }],
      [{ readOnly: true }],
      [{ readOnly: false }],
    ])
    expect(monaco.changeSubscriptionDispose).toHaveBeenCalledOnce()
    expect(monaco.editorDispose).toHaveBeenCalledOnce()
    expect(monaco.editorModelDispose).toHaveBeenCalledOnce()
  })
})
