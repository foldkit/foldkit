import { Context, Effect, Layer } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

export class LocalStorage extends Context.Service<
  LocalStorage,
  KeyValueStore.KeyValueStore
>()('WebsiteLocalStorage') {}

export class SessionStorage extends Context.Service<
  SessionStorage,
  KeyValueStore.KeyValueStore
>()('WebsiteSessionStorage') {}

export const LocalStorageLive = Layer.effect(
  LocalStorage,
  Effect.service(KeyValueStore.KeyValueStore),
).pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage))

export const SessionStorageLive = Layer.effect(
  SessionStorage,
  Effect.service(KeyValueStore.KeyValueStore),
).pipe(Layer.provide(BrowserKeyValueStore.layerSessionStorage))
