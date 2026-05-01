// @ts-nocheck
import * as Shared from '@typing-game/shared'
import { Effect, SubscriptionRef } from 'effect'
import { Rpc } from 'effect/unstable/rpc'

import * as Rooms from '../roomById.js'

export const getRoomById =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>) =>
  (payload: Rpc.Payload<typeof Shared.getRoomByIdRpc>) =>
    Effect.gen(function* () {
      const roomById = yield* SubscriptionRef.get(roomByIdRef)
      return yield* Rooms.getById(roomById, payload.roomId)
    })
