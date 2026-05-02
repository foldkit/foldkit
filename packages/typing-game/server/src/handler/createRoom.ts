import * as Shared from '@typing-game/shared'
import { Clock, Effect, HashMap, Option, SubscriptionRef } from 'effect'
import { Rpc } from 'effect/unstable/rpc'
import { randomUUID } from 'node:crypto'

import { ROOM_ID_WORDS } from '../constants.js'
import * as Room from '../room.js'

export const createRoom =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>) =>
  (payload: Rpc.Payload<typeof Shared.createRoomRpc>) =>
    Effect.gen(function* () {
      const roomId = yield* Room.generateUniqueId(ROOM_ID_WORDS)
      const playerId = yield* Effect.sync(() => randomUUID())

      const player: Shared.Player = {
        id: playerId,
        username: payload.username,
      }

      const createdAt = yield* Clock.currentTimeMillis

      const newRoom: Shared.Room = {
        id: roomId,
        players: [player],
        hostId: playerId,
        status: Shared.Waiting.make({}),
        maybeGame: Option.none(),
        maybeScoreboard: Option.none(),
        createdAt,
        usedGameTexts: [],
      }

      yield* SubscriptionRef.update(roomByIdRef, roomById =>
        HashMap.set(roomById, newRoom.id, newRoom),
      )

      return { player, room: newRoom }
    })
