import { Deferred, Effect, Fiber, Layer, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { describe, expect, test } from 'vitest'

import * as Shared from '@typing-game/shared'

import { ROOM_PLAYER_SESSION_KEY } from '../../constant'
import { ClearSession, LoadSession, SavePlayerSession } from './command'
import { Message } from './message'
import { RoomPlayerSession, RoomPlayerSessionJsonString } from './model'

const sessionA = RoomPlayerSession.make({
  roomId: 'A',
  player: Shared.Player.make({ id: 'alice', username: 'alice' }),
})
const sessionB = RoomPlayerSession.make({
  roomId: 'B',
  player: Shared.Player.make({ id: 'bob', username: 'bob' }),
})

const SessionCommandsLayer = Layer.mergeAll(
  ClearSession.layer,
  LoadSession.layer,
  SavePlayerSession.layer,
)

describe('Room session persistence', () => {
  test('a delayed save from A cannot overwrite the session for B', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const saveStarted = yield* Deferred.make<void>()
        const allowSave = yield* Deferred.make<void>()
        const delayedStore = KeyValueStore.makeStringOnly({
          ...store,
          set: (key, value) =>
            Effect.gen(function* () {
              const session = yield* Schema.decodeEffect(
                RoomPlayerSessionJsonString,
              )(value).pipe(Effect.orDie)

              if (session.roomId === 'A') {
                yield* Deferred.succeed(saveStarted, undefined)
                yield* Deferred.await(allowSave)
              }

              yield* store.set(key, value)
            }),
        })

        yield* Effect.gen(function* () {
          const saveA = yield* Effect.forkChild(
            SavePlayerSession({ session: sessionA }).effect,
          )
          yield* Deferred.await(saveStarted)
          yield* SavePlayerSession({ session: sessionB }).effect
          yield* Deferred.succeed(allowSave, undefined)
          yield* Fiber.join(saveA)

          const loadedB = yield* LoadSession({ roomId: 'B' }).effect
          const loadedA = yield* LoadSession({ roomId: 'A' }).effect

          expect(loadedB).toEqual(
            Message.CompletedLoadSession({
              maybeSession: Option.some(sessionB),
            }),
          )
          expect(loadedA).toEqual(
            Message.CompletedLoadSession({
              maybeSession: Option.some(sessionA),
            }),
          )
        }).pipe(
          Effect.provide(
            SessionCommandsLayer.pipe(
              Layer.provide(
                Layer.succeed(KeyValueStore.KeyValueStore, delayedStore),
              ),
            ),
          ),
        )
      }).pipe(Effect.provide(KeyValueStore.layerMemory)),
    )
  })

  test('clearing A leaves B intact', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        yield* SavePlayerSession({ session: sessionA }).effect
        yield* SavePlayerSession({ session: sessionB }).effect
        yield* ClearSession({ roomId: 'A' }).effect

        expect(yield* LoadSession({ roomId: 'A' }).effect).toEqual(
          Message.CompletedLoadSession({ maybeSession: Option.none() }),
        )
        expect(yield* LoadSession({ roomId: 'B' }).effect).toEqual(
          Message.CompletedLoadSession({ maybeSession: Option.some(sessionB) }),
        )
      }).pipe(
        Effect.provide(
          SessionCommandsLayer.pipe(
            Layer.provideMerge(KeyValueStore.layerMemory),
          ),
        ),
      ),
    )
  })

  test('legacy sessions are restored and cleared only for their original room', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const sessionJson = yield* Schema.encodeEffect(
          RoomPlayerSessionJsonString,
        )(sessionA)
        yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)

        expect(yield* LoadSession({ roomId: 'B' }).effect).toEqual(
          Message.CompletedLoadSession({ maybeSession: Option.none() }),
        )
        yield* ClearSession({ roomId: 'B' }).effect
        expect(yield* LoadSession({ roomId: 'A' }).effect).toEqual(
          Message.CompletedLoadSession({ maybeSession: Option.some(sessionA) }),
        )
        yield* ClearSession({ roomId: 'A' }).effect
        expect(yield* LoadSession({ roomId: 'A' }).effect).toEqual(
          Message.CompletedLoadSession({ maybeSession: Option.none() }),
        )
      }).pipe(
        Effect.provide(
          SessionCommandsLayer.pipe(
            Layer.provideMerge(KeyValueStore.layerMemory),
          ),
        ),
      ),
    )
  })
})
