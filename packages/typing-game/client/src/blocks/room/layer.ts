import { Layer } from 'effect'

import * as Command from './command'
import { subscriptions } from './subscription'
import { NavigateHome } from './update'

export const EffectsLayer = Layer.mergeAll(
  Command.FetchRoom.layer,
  Command.LoadSession.layer,
  Command.JoinRoom.layer,
  Command.StartGame.layer,
  Command.UpdatePlayerProgress.layer,
  Command.CopyRoomId.layer,
  Command.WaitForExitCountdownInterval.layer,
  Command.WaitBeforeHidingRoomIdCopiedIndicator.layer,
  Command.SavePlayerSession.layer,
  Command.ClearSession.layer,
  Command.FocusRoomPageUsernameInput.layer,
  Command.FocusUserGameTextInput.layer,
  subscriptions.layer,
  NavigateHome.layer,
)
