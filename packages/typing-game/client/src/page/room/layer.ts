import { Layer } from 'effect'

import * as Commands from './command'
import { subscriptions } from './subscription'
import { NavigateHome } from './update'

export const EffectsLayer = Layer.mergeAll(
  Commands.FetchRoom.layer,
  Commands.LoadSession.layer,
  Commands.JoinRoom.layer,
  Commands.StartGame.layer,
  Commands.UpdatePlayerProgress.layer,
  Commands.CopyRoomId.layer,
  Commands.WaitForExitCountdownInterval.layer,
  Commands.WaitBeforeHidingRoomIdCopiedIndicator.layer,
  Commands.SavePlayerSession.layer,
  Commands.ClearSession.layer,
  Commands.FocusRoomPageUsernameInput.layer,
  Commands.FocusUserGameTextInput.layer,
  subscriptions.roomUpdates.layer,
  subscriptions.roomKeyPresses.layer,
  NavigateHome.layer,
)
