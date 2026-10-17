import { Effect } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import * as Editor from './commandHostContract'

const DOCUMENT_STORAGE_KEY = 'editor-document'

const SaveDocumentLayer = Editor.SaveDocument.toLayer(
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ contents }) =>
      store.set(DOCUMENT_STORAGE_KEY, contents).pipe(
        Effect.as(Editor.Message.SucceededSaveDocument()),
        Effect.catch(() =>
          Effect.succeed(
            Editor.Message.FailedSaveDocument({
              reason: 'The document could not be saved.',
            }),
          ),
        ),
      )
  }),
)

export const editor = Editor.block.provideHandlers(SaveDocumentLayer)

const ServicesLayer = BrowserKeyValueStore.layerLocalStorage

export const ApplicationLayer = ServicesLayer
