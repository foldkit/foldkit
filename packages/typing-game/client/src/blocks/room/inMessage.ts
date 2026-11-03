import { defineMessageUnion } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

export const InMessage = defineMessageUnion({
  InformedOfJoin: { player: Shared.Player },
})
export type InMessage = typeof InMessage.Type
