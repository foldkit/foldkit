import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const CompletedFocusUsernameInput = m('CompletedFocusUsernameInput')
export const CompletedFocusRoomIdInput = m('CompletedFocusRoomIdInput')
export const SubmittedUsernameForm = m('SubmittedUsernameForm')
export const ChangedUsername = m('ChangedUsername', { value: S.String })
export const BlurredUsernameInput = m('BlurredUsernameInput')
export const ChangedRoomId = m('ChangedRoomId', { value: S.String })
export const BlurredRoomIdInput = m('BlurredRoomIdInput')
export const ClickedCreateRoom = m('ClickedCreateRoom')
export const ClickedJoinRoom = m('ClickedJoinRoom')
export const CreatedRoom = m('CreatedRoom', {
  roomId: S.String,
  player: Shared.Player,
})
export const JoinedRoom = m('JoinedRoom', {
  roomId: S.String,
  player: Shared.Player,
})
export const FailedEnterRoom = m('FailedEnterRoom', { error: S.String })
export const PressedKey = m('PressedKey', { key: S.String })

export const Message = S.Union(
  CompletedFocusUsernameInput,
  CompletedFocusRoomIdInput,
  SubmittedUsernameForm,
  ChangedUsername,
  BlurredUsernameInput,
  ChangedRoomId,
  BlurredRoomIdInput,
  ClickedCreateRoom,
  ClickedJoinRoom,
  CreatedRoom,
  JoinedRoom,
  FailedEnterRoom,
  PressedKey,
)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededCreateRoom = m('SucceededCreateRoom', {
  roomId: S.String,
  player: Shared.Player,
})
export const SucceededJoinRoom = m('SucceededJoinRoom', {
  roomId: S.String,
  player: Shared.Player,
})

export const OutMessage = S.Union(SucceededCreateRoom, SucceededJoinRoom)
export type OutMessage = typeof OutMessage.Type
