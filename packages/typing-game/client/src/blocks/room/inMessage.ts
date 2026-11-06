import { defineInMessageUnion } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

export const InMessage = defineInMessageUnion({
  InformedOfJoin: { player: Shared.Player },
})
export type InMessage = typeof InMessage.Type
