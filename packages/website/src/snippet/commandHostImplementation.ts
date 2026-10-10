import { Effect, Layer } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { Message, SaveDocument } from './commandHostContract'

const DOCUMENT_STORAGE_KEY = 'editor-document'

export const EffectsLayer = SaveDocument.toLayer(
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ contents }) =>
      store.set(DOCUMENT_STORAGE_KEY, contents).pipe(
        Effect.as(Message.SucceededSaveDocument()),
        Effect.catch(() =>
          Effect.succeed(
            Message.FailedSaveDocument({
              reason: 'The document could not be saved.',
            }),
          ),
        ),
      )
  }),
)

const ServicesLayer = BrowserKeyValueStore.layerLocalStorage

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
