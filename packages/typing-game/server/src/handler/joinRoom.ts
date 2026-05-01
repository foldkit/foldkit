// @ts-nocheck
import * as Shared from '@typing-game/shared'
import { Array, Effect, HashMap, Number, Struct, SubscriptionRef } from 'effect'
import { Rpc } from 'effect/unstable/rpc'
import { randomUUID } from 'node:crypto'

import * as Rooms from '../roomById.js'

const makeUniqueUsername = (
  desiredUsername: string,
  existingPlayers: ReadonlyArray<Shared.Player>,
): string => {
  const existingUsernames = Array.map(
    existingPlayers,
    player => player.username,
  )

  const usernameExists = (username: string) =>
    Array.contains(existingUsernames, username)

  if (!usernameExists(desiredUsername)) {
    return desiredUsername
  }

  const findAvailableUsername = (counter: number): string => {
    const candidateUsername = `${desiredUsername} (${counter})`
    return usernameExists(candidateUsername)
      ? findAvailableUsername(Number.increment(counter))
      : candidateUsername
  }

  return findAvailableUsername(2)
}

export const joinRoom =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>) =>
  (payload: Rpc.Payload<typeof Shared.joinRoomRpc>) =>
    Effect.gen(function* () {
      const playerId = yield* Effect.sync(() => randomUUID())

      const [room, player] = yield* SubscriptionRef.modifyEffect(
        roomByIdRef,
        roomById =>
          Rooms.getById(roomById, payload.roomId).pipe(
            Effect.map(room => {
              const uniqueUsername = makeUniqueUsername(
                payload.username,
                room.players,
              )

              const player = Shared.Player.make({
                id: playerId,
                username: uniqueUsername,
              })

              const updatedRoom = Struct.evolve(room, {
                players: players => [...players, player],
              })

              const nextRoomById = HashMap.set(
                roomById,
                payload.roomId,
                updatedRoom,
              )

              return [[updatedRoom, player], nextRoomById] as const
            }),
          ),
      )

      return { player, room }
    })
