import { Option, Schema as S } from 'effect'
import { AsyncData } from 'foldkit'

import * as Shared from '@typing-game/shared'

export const RoomPlayerSession = S.Struct({
  roomId: S.String,
  player: Shared.Player,
})
export type RoomPlayerSession = typeof RoomPlayerSession.Type

export const RoomAsyncData = AsyncData.Schema(Shared.Room, S.String)
export type RoomAsyncData = typeof RoomAsyncData.schema.Type

export const Model = S.Struct({
  roomAsyncData: RoomAsyncData.schema,
  maybeSession: S.Option(RoomPlayerSession),
  userGameText: S.String,
  charsTyped: S.Number,
  username: S.String,
  isRoomIdCopyIndicatorVisible: S.Boolean,
  exitCountdownSecondsLeft: S.Number,
})
export type Model = typeof Model.Type

export const capturesKeyboard = (model: Model): boolean => {
  const isRoomPlayable = Option.exists(
    AsyncData.getData(model.roomAsyncData),
    ({ status }) => status._tag === 'Waiting' || status._tag === 'Finished',
  )

  return Option.isSome(model.maybeSession) && isRoomPlayable
}
