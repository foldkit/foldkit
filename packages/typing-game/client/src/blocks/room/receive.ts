import { RoomComposition } from './composition'
import type { Context } from './context'
import { recordJoinedPlayer } from './steps'

export const receive = RoomComposition.makeReceive.withContext(
  (context: Context) => ({
    InformedOfJoin: (model, { player }) =>
      recordJoinedPlayer(model, player, context),
  }),
)
