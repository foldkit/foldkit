import { Deferred, Effect, Fiber, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { describe, expect, it } from '@effect/vitest'
import * as Shared from '@typing-game/shared'

import {
  ROOM_PLAYER_SESSION_KEY,
  Room,
  RoomPlayerSession,
  RoomPlayerSessionJsonString,
  makeSessionCommands,
} from './room'

const sessionA = RoomPlayerSession.make({
  roomId: 'A',
  player: Shared.Player.make({ id: 'alice', username: 'alice' }),
})
const sessionB = RoomPlayerSession.make({
  roomId: 'B',
  player: Shared.Player.make({ id: 'bob', username: 'bob' }),
})

describe('Room session persistence', () => {
  it.effect('a delayed save from A cannot overwrite the session for B', () =>
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
      const { LoadSession, SavePlayerSession } =
        makeSessionCommands(delayedStore)

      const saveA = yield* Effect.forkChild(
        SavePlayerSession({ session: sessionA }),
      )
      yield* Deferred.await(saveStarted)
      yield* SavePlayerSession({ session: sessionB })
      yield* Deferred.succeed(allowSave, undefined)
      yield* Fiber.join(saveA)

      expect(yield* LoadSession({ roomId: 'B' })).toEqual(
        Room.Message.CompletedLoadSession({
          maybeSession: Option.some(sessionB),
        }),
      )
      expect(yield* LoadSession({ roomId: 'A' })).toEqual(
        Room.Message.CompletedLoadSession({
          maybeSession: Option.some(sessionA),
        }),
      )
    }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )

  it.effect('clearing A leaves B intact', () =>
    Effect.gen(function* () {
      const { ClearSession, LoadSession, SavePlayerSession } =
        makeSessionCommands(yield* KeyValueStore.KeyValueStore)

      yield* SavePlayerSession({ session: sessionA })
      yield* SavePlayerSession({ session: sessionB })
      yield* ClearSession({ roomId: 'A' })

      expect(yield* LoadSession({ roomId: 'A' })).toEqual(
        Room.Message.CompletedLoadSession({ maybeSession: Option.none() }),
      )
      expect(yield* LoadSession({ roomId: 'B' })).toEqual(
        Room.Message.CompletedLoadSession({
          maybeSession: Option.some(sessionB),
        }),
      )
    }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )

  it.effect(
    'legacy sessions are restored and cleared only for their original room',
    () =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const { ClearSession, LoadSession } = makeSessionCommands(store)
        const sessionJson = yield* Schema.encodeEffect(
          RoomPlayerSessionJsonString,
        )(sessionA)
        yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)

        expect(yield* LoadSession({ roomId: 'B' })).toEqual(
          Room.Message.CompletedLoadSession({ maybeSession: Option.none() }),
        )
        yield* ClearSession({ roomId: 'B' })
        expect(yield* LoadSession({ roomId: 'A' })).toEqual(
          Room.Message.CompletedLoadSession({
            maybeSession: Option.some(sessionA),
          }),
        )
        yield* ClearSession({ roomId: 'A' })
        expect(yield* LoadSession({ roomId: 'A' })).toEqual(
          Room.Message.CompletedLoadSession({ maybeSession: Option.none() }),
        )
      }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )
})
