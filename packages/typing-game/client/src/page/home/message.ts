import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const CompletedUsernameInputFocus = m('CompletedUsernameInputFocus')
export const CompletedRoomIdInputFocus = m('CompletedRoomIdInputFocus')
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
export const FailedRoom = m('FailedRoom', { error: S.String })
export const PressedKey = m('PressedKey', { key: S.String })

export const Message = S.Union(
  CompletedUsernameInputFocus,
  CompletedRoomIdInputFocus,
  SubmittedUsernameForm,
  ChangedUsername,
  BlurredUsernameInput,
  ChangedRoomId,
  BlurredRoomIdInput,
  ClickedCreateRoom,
  ClickedJoinRoom,
  CreatedRoom,
  JoinedRoom,
  FailedRoom,
  PressedKey,
)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededRoomCreation = m('SucceededRoomCreation', {
  roomId: S.String,
  player: Shared.Player,
})
export const SucceededRoomJoin = m('SucceededRoomJoin', {
  roomId: S.String,
  player: Shared.Player,
})

export const OutMessage = S.Union(SucceededRoomCreation, SucceededRoomJoin)
export type OutMessage = typeof OutMessage.Type
