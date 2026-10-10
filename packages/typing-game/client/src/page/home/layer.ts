import { Layer } from 'effect'

import * as Commands from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Commands.CreateRoom.layer,
  Commands.JoinRoomFromHome.layer,
  Commands.FocusUsernameInput.layer,
  Commands.FocusRoomIdInput.layer,
  subscriptions.homeKeyPresses.layer,
)
