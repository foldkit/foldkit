import { Effect, Layer, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block, Program, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { DocumentStore, Editor, EditorLive } from './commandHostContract'

const DOCUMENT_STORAGE_KEY = 'document'

const BrowserDocumentStore = Layer.effect(
  DocumentStore,
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return {
      save: contents =>
        store
          .set(DOCUMENT_STORAGE_KEY, contents)
          .pipe(Effect.mapError(cause => new Error(String(cause)))),
    }
  }),
).pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage))

class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ editor: Editor }),
}) {}

const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const editor = yield* new Editor('editor')

    return {
      model: { editor },
      view: (model, h) => ({ title: 'Notes', body: model.editor.view() }),
    }
  }),
)

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(EditorLive),
    Layer.provide(BrowserDocumentStore),
  ),
  container: document.getElementById('root'),
})

Runtime.run(program)
