import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'

import { makeRemoteData } from '../../makeRemoteData'

export const RoomPlayerSession = S.Struct({
  roomId: S.String,
  player: Shared.Player,
})
export type RoomPlayerSession = typeof RoomPlayerSession.Type

export const RoomRemoteData = makeRemoteData(S.String, Shared.Room)

export const Model = S.Struct({
  roomRemoteData: RoomRemoteData.Union,
  maybeSession: S.Option(RoomPlayerSession),
  userGameText: S.String,
  charsTyped: S.Number,
  username: S.String,
  isRoomIdCopyIndicatorVisible: S.Boolean,
  exitCountdownSecondsLeft: S.Number,
})
export type Model = typeof Model.Type
