import { Effect } from 'effect'
import { Command } from 'foldkit/command'

import { RoomsClient } from '../../rpc'
import { CreatedRoom, FailedRoom } from './message'

export const createRoom = (
  username: string,
): Command<typeof CreatedRoom | typeof FailedRoom> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return CreatedRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedRoom({ error: String(error) })),
    ),
    Effect.provide(RoomsClient.Default),
  )
