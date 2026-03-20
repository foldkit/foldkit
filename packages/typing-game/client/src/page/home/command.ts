import { Effect } from 'effect'
import { Command } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { CreatedRoom, FailedEnterRoom } from './message'

const CreateRoom = Command.define('CreateRoom')

export const createRoom = (username: string) =>
  CreateRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player, room } = yield* client.createRoom({ username })
      return CreatedRoom({ roomId: room.id, player })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedEnterRoom({ error: String(error) })),
      ),
      Effect.provide(RoomsClient.Default),
    ),
  )
