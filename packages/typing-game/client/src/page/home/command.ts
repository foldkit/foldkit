import { Effect } from 'effect'
import { Command } from 'foldkit'

import { RoomsClient, RoomsClientLive } from '../../rpc.js'
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
      Effect.catch(error =>
        Effect.succeed(FailedJoinRoom({ error: String(error) })),
      ),
      Effect.provide(RoomsClientLive),
    ),
  )

export const joinRoom = (username: string, roomId: string) =>
  JoinRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player, room } = yield* client.joinRoom({ username, roomId })
      return SucceededJoinRoom({ roomId: room.id, player })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(FailedJoinRoom({ error: String(error) })),
      ),
      Effect.provide(RoomsClientLive),
    ),
  )
