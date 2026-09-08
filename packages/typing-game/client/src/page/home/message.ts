import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

export const Message = defineMessageUnion({
  CompletedFocusUsernameInput: {},
  CompletedFocusRoomIdInput: {},
  SubmittedUsernameForm: {},
  ChangedUsername: { value: Schema.String },
  BlurredUsernameInput: {},
  ChangedRoomId: { value: Schema.String },
  BlurredRoomIdInput: {},
  SubmittedJoinRoomForm: {},
  SucceededCreateRoom: { roomId: Schema.String, player: Shared.Player },
  SucceededJoinRoom: { roomId: Schema.String, player: Shared.Player },
  FailedCreateRoom: { error: Schema.String },
  FailedJoinRoom: { error: Schema.String },
  PressedKey: { key: Schema.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  CreatedRoom: { roomId: Schema.String, player: Shared.Player },
  JoinedRoom: { roomId: Schema.String, player: Shared.Player },
})
export type OutMessage = typeof OutMessage.Type
