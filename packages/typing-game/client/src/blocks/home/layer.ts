import { Layer } from 'effect'

import * as Command from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Command.CreateRoom.layer,
  Command.JoinRoomFromHome.layer,
  Command.FocusUsernameInput.layer,
  Command.FocusRoomIdInput.layer,
  subscriptions.layer,
)
