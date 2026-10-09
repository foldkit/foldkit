import { Effect, Layer } from 'effect'
import { afterEach, expect, it } from 'vitest'

import {
  LocalStorage,
  LocalStorageLayer,
  SessionStorage,
  SessionStorageLayer,
} from './storage'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

it('provides independent local and session stores in one application context', async () => {
  const values = await Effect.runPromise(
    Effect.gen(function* () {
      const local = yield* LocalStorage
      const session = yield* SessionStorage

      yield* local.set('preference', 'local')
      yield* session.set('preference', 'session')

      return {
        local: yield* local.get('preference'),
        session: yield* session.get('preference'),
      }
    }).pipe(
      Effect.provide(Layer.mergeAll(LocalStorageLayer, SessionStorageLayer)),
    ),
  )

  expect(values).toEqual({ local: 'local', session: 'session' })
})
