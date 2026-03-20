import { Effect } from 'effect'
import { Command } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { CreatedRoom, FailedEnterRoom } from './message'

export const createRoom = (
  username: string,
): Command.Command<typeof CreatedRoom | typeof FailedEnterRoom> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return CreatedRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedEnterRoom({ error: String(error) })),
    ),
    Effect.provide(RoomsClient.Default),
    Command.make('CreateRoom'),
  )
