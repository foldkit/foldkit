import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { RoomPlayerSession } from './model'

export const CompletedFocusRoomPageUsernameInput = m(
  'CompletedFocusRoomPageUsernameInput',
)
export const CompletedFocusUserGameTextInput = m(
  'CompletedFocusUserGameTextInput',
)
export const CompletedNavigateHome = m('CompletedNavigateHome')
export const CompletedRequestGameStart = m('CompletedRequestGameStart')
export const CompletedUpdatePlayerProgress = m('CompletedUpdatePlayerProgress')
export const CompletedSaveSession = m('CompletedSaveSession')
export const CompletedClearSession = m('CompletedClearSession')
export const FailedJoinRoom = m('FailedJoinRoom')
export const FailedCopyClipboard = m('FailedCopyClipboard')
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
export const FailedStreamRoom = m('FailedStreamRoom', { error: S.String })
export const RequestedStartGame = m('RequestedStartGame', {
  roomId: S.String,
  playerId: S.String,
})
export const LoadedSession = m('LoadedSession', {
  maybeSession: S.Option(RoomPlayerSession),
})
export const SucceededFetchRoom = m('SucceededFetchRoom', { room: Shared.Room })
export const FailedFetchRoom = m('FailedFetchRoom', { roomId: S.String })
export const ClickedCopyRoomId = m('ClickedCopyRoomId', { roomId: S.String })
export const SucceededCopyRoomId = m('SucceededCopyRoomId')
export const HiddenRoomIdCopiedIndicator = m('HiddenRoomIdCopiedIndicator')
export const TickedExitCountdown = m('TickedExitCountdown')
export const JoinedRoom = m('JoinedRoom', {
  roomId: S.String,
  player: Shared.Player,
})

export const Message = S.Union(
  CompletedFocusRoomPageUsernameInput,
  CompletedFocusUserGameTextInput,
  CompletedNavigateHome,
  CompletedRequestGameStart,
  CompletedUpdatePlayerProgress,
  CompletedSaveSession,
  CompletedClearSession,
  FailedJoinRoom,
  FailedCopyClipboard,
  PressedKey,
  ChangedUserText,
  BlurredRoomPageUsernameInput,
  ChangedRoomPageUsername,
  SubmittedJoinRoomFromPage,
  UpdatedRoom,
  FailedStreamRoom,
  RequestedStartGame,
  LoadedSession,
  SucceededFetchRoom,
  FailedFetchRoom,
  ClickedCopyRoomId,
  SucceededCopyRoomId,
  HiddenRoomIdCopiedIndicator,
  TickedExitCountdown,
  JoinedRoom,
)
export type Message = typeof Message.Type
