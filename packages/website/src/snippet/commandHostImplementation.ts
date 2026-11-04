import { Effect, Layer } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Program } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  EditorBlock,
  EditorStartup,
  EditorStorage,
  layer,
} from './commandHostContract'

const DOCUMENT_STORAGE_KEY = 'editor-document'

const EditorStorageLayer = Layer.effect(
  EditorStorage,
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return {
      saveDocument: (contents: string) =>
        store
          .set(DOCUMENT_STORAGE_KEY, contents)
          .pipe(Effect.mapError(error => new Error(globalThis.String(error)))),
    }
  }),
)

export const ApplicationLayer = EditorStorageLayer.pipe(
  Layer.provide(BrowserKeyValueStore.layerLocalStorage),
)

export const program = Program.makeElement({
  block: EditorBlock,
  layer,
  Flags: EditorStartup,
  flags: Effect.succeed(EditorStartup.make({ contents: 'My document' })),
  container: document.getElementById('root'),
}).provide(ApplicationLayer)
