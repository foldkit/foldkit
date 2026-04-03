import { Effect } from 'effect'
import { Command } from 'foldkit'

import { RoomsClient } from '../../rpc'
import {
  FailedJoinRoom,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from './message'

export const CreateRoom = Command.define(
  'CreateRoom',
  SucceededCreateRoom,
  FailedJoinRoom,
)

export const JoinRoom = Command.define(
  'JoinRoom',
  SucceededJoinRoom,
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

export const joinRoom = (username: string, roomId: string) =>
  JoinRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player, room } = yield* client.joinRoom({ username, roomId })
      return SucceededJoinRoom({ roomId: room.id, player })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedJoinRoom({ error: String(error) })),
      ),
      Effect.provide(RoomsClient.Default),
    ),
  )
