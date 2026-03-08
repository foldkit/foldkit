import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { RoomPlayerSession } from './model'

export const NoOp = m('NoOp')
export const PressedKey = m('PressedKey', { key: S.String })
export const ChangedUserText = m('ChangedUserText', { value: S.String })
export const BlurredRoomPageUsernameInput = m('BlurredRoomPageUsernameInput')
export const ChangedRoomPageUsername = m('ChangedRoomPageUsername', {
  value: S.String,
})
export const SubmittedJoinRoomFromPage = m('SubmittedJoinRoomFromPage', {
  roomId: S.String,
})
export const UpdatedRoom = m('UpdatedRoom', {
  room: Shared.Room,
  maybePlayerProgress: S.Option(Shared.PlayerProgress),
})
export const FailedRoomStream = m('FailedRoomStream', { error: S.String })
export const RequestedStartGame = m('RequestedStartGame', {
  roomId: S.String,
  playerId: S.String,
})
export const LoadedSession = m('LoadedSession', {
  maybeSession: S.Option(RoomPlayerSession),
})
export const SucceededRoomFetch = m('SucceededRoomFetch', { room: Shared.Room })
export const FailedRoomFetch = m('FailedRoomFetch', { roomId: S.String })
export const ClickedCopyRoomId = m('ClickedCopyRoomId', { roomId: S.String })
export const SucceededCopyRoomId = m('SucceededCopyRoomId')
export const HiddenRoomIdCopiedIndicator = m('HiddenRoomIdCopiedIndicator')
export const TickedExitCountdown = m('TickedExitCountdown')
export const JoinedRoom = m('JoinedRoom', {
  roomId: S.String,
  player: Shared.Player,
})

export const Message = S.Union(
  NoOp,
  PressedKey,
  ChangedUserText,
  BlurredRoomPageUsernameInput,
  ChangedRoomPageUsername,
  SubmittedJoinRoomFromPage,
  UpdatedRoom,
  FailedRoomStream,
  RequestedStartGame,
  LoadedSession,
  SucceededRoomFetch,
  FailedRoomFetch,
  ClickedCopyRoomId,
  SucceededCopyRoomId,
  HiddenRoomIdCopiedIndicator,
  TickedExitCountdown,
  JoinedRoom,
)
export type Message = typeof Message.Type
