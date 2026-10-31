import { Effect, Layer } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { PagefindLayer, PagefindService, unavailablePagefind } from './pagefind'
import {
  LocalStorage,
  LocalStorageLayer,
  SessionStorage,
  SessionStorageLayer,
} from './storage'

export const ApplicationLayer = Layer.mergeAll(
  LocalStorageLayer,
  SessionStorageLayer,
  PagefindLayer,
)

const MemoryLocalStorageLayer = Layer.effect(
  LocalStorage,
  Effect.service(KeyValueStore.KeyValueStore),
).pipe(Layer.provide(KeyValueStore.layerMemory))

const MemorySessionStorageLayer = Layer.effect(
  SessionStorage,
  Effect.service(KeyValueStore.KeyValueStore),
).pipe(Layer.provide(KeyValueStore.layerMemory))

export const ApplicationServerLayer = Layer.mergeAll(
  MemoryLocalStorageLayer,
  MemorySessionStorageLayer,
  Layer.succeed(PagefindService, unavailablePagefind),
)
