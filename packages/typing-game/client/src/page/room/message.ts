import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

import { RoomPlayerSession } from './model'

export const Message = defineMessageUnion({
  CompletedFocusRoomPageUsernameInput: {},
  CompletedFocusUserGameTextInput: {},
  CompletedNavigateHome: {},
  SucceededStartGame: {},
  FailedStartGame: {},
  CompletedUpdatePlayerProgress: {},
  CompletedSavePlayerSession: {},
  CompletedClearSession: {},
  FailedJoinRoom: {},
  FailedCopyRoomId: {},
  PressedKey: { key: Schema.String },
  ChangedUserText: { value: Schema.String },
  BlurredRoomPageUsernameInput: {},
  ChangedRoomPageUsername: { value: Schema.String },
  SubmittedJoinRoomFromPage: {},
  UpdatedRoom: {
    room: Shared.Room,
    maybePlayerProgress: Schema.Option(Shared.PlayerProgress),
  },
  FailedStreamRoom: { error: Schema.String },
  CompletedLoadSession: { maybeSession: Schema.Option(RoomPlayerSession) },
  SucceededFetchRoom: { room: Shared.Room },
  FailedFetchRoom: {},
  ClickedCopyRoomId: {},
  SucceededCopyRoomId: {},
  CompletedWaitBeforeHidingRoomIdCopiedIndicator: {},
  CompletedWaitForExitCountdownInterval: {},
  SucceededJoinRoom: { player: Shared.Player },
})
export type Message = typeof Message.Type
