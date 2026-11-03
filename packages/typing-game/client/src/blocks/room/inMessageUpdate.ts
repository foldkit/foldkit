import { RoomComposition } from './composition'
import type { Context } from './context'
import { recordJoinedPlayer } from './steps'

export const inMessageUpdate = RoomComposition.makeInMessageUpdate.withContext(
  (context: Context) => ({
    InformedOfJoin: (model, { player }) =>
      recordJoinedPlayer(model, player, context),
  }),
)
