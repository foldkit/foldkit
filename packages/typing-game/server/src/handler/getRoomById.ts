import { Effect, SubscriptionRef } from 'effect'
import { Rpc } from 'effect/unstable/rpc'

import * as Shared from '@typing-game/shared'

import * as Rooms from '../roomById.ts'

export const getRoomById =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>) =>
  (payload: Rpc.Payload<typeof Shared.getRoomByIdRpc>) =>
    Effect.gen(function* () {
      const roomById = yield* SubscriptionRef.get(roomByIdRef)
      return yield* Rooms.getById(roomById, payload.roomId)
    })
