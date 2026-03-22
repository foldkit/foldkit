import { Effect } from 'effect'
import { Command } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { FailedJoinRoom, SucceededCreateRoom } from './message'

export const CreateRoom = Command.define(
  'CreateRoom',
  SucceededCreateRoom,
  FailedJoinRoom,
)

export const createRoom = (username: string) =>
  CreateRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player, room } = yield* client.createRoom({ username })
      return SucceededCreateRoom({ roomId: room.id, player })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedJoinRoom({ error: String(error) })),
      ),
      Effect.provide(RoomsClient.Default),
    ),
  )
