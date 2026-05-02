import * as Shared from '@typing-game/shared'
import { Effect, HashMap, Struct, SubscriptionRef } from 'effect'

export const getById = (roomById: Shared.RoomById, id: string) =>
  Effect.fromOption(HashMap.get(roomById, id)).pipe(
    Effect.mapError(() => new Shared.RoomNotFoundError({ roomId: id })),
  )

export const updateRoom =
  (
    roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
    roomId: string,
  ) =>
  (f: (room: Shared.Room) => Shared.Room) =>
    SubscriptionRef.updateEffect(roomByIdRef, roomById =>
      Effect.gen(function* () {
        const room = yield* getById(roomById, roomId)
        const updatedRoom = f(room)
        return HashMap.set(roomById, roomId, updatedRoom)
      }),
    )

export const updateRoomStatus =
  (
    roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
    roomId: string,
  ) =>
  (status: Shared.GameStatus) =>
    updateRoom(roomByIdRef, roomId)(Struct.evolve({ status: () => status }))
