import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

export const CompletedFocusUsernameInput = m('CompletedFocusUsernameInput')
export const CompletedFocusRoomIdInput = m('CompletedFocusRoomIdInput')
export const SubmittedUsernameForm = m('SubmittedUsernameForm')
export const ChangedUsername = m('ChangedUsername', { value: S.String })
export const BlurredUsernameInput = m('BlurredUsernameInput')
export const ChangedRoomId = m('ChangedRoomId', { value: S.String })
export const BlurredRoomIdInput = m('BlurredRoomIdInput')
export const SubmittedJoinRoomForm = m('SubmittedJoinRoomForm')
export const SucceededCreateRoom = m('SucceededCreateRoom', {
  roomId: S.String,
  player: Shared.Player,
})
export const SucceededJoinRoom = m('SucceededJoinRoom', {
  roomId: S.String,
  player: Shared.Player,
})
export const FailedCreateRoom = m('FailedCreateRoom', { error: S.String })
export const FailedJoinRoom = m('FailedJoinRoom', { error: S.String })
export const PressedKey = m('PressedKey', { key: S.String })

export const Message = S.Union([
  CompletedFocusUsernameInput,
  CompletedFocusRoomIdInput,
  SubmittedUsernameForm,
  ChangedUsername,
  BlurredUsernameInput,
  ChangedRoomId,
  BlurredRoomIdInput,
  SubmittedJoinRoomForm,
  SucceededCreateRoom,
  SucceededJoinRoom,
  FailedCreateRoom,
  FailedJoinRoom,
  PressedKey,
])
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = S.Union([SucceededCreateRoom, SucceededJoinRoom])
export type OutMessage = typeof OutMessage.Type
