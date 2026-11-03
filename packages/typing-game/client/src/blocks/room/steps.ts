import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { SavePlayerSession } from './command'
import type { Context } from './context'
import { Model, RoomPlayerSession } from './model'

export const recordJoinedPlayer = (
  model: Model,
  player: Shared.Player,
  context: Context,
) => {
  const session = RoomPlayerSession.make({
    roomId: context.roomId,
    player,
  })

  return {
    model: modifyFields(model, {
      maybeSession: () => Option.some(session),
    }),
    commands: [SavePlayerSession({ session })],
  }
}
