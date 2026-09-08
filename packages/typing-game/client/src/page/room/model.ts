import { Option, Schema } from 'effect'
import { AsyncData } from 'foldkit'

import * as Shared from '@typing-game/shared'

export const RoomPlayerSession = Schema.Struct({
  roomId: Schema.String,
  player: Shared.Player,
})
export type RoomPlayerSession = typeof RoomPlayerSession.Type

export const RoomPlayerSessionJsonString = Schema.fromJsonString(
  Schema.toCodecJson(RoomPlayerSession),
)

export const RoomAsyncData = AsyncData.Schema(Shared.Room, Schema.String)
export type RoomAsyncData = typeof RoomAsyncData.schema.Type

export const Model = Schema.Struct({
  roomAsyncData: RoomAsyncData.schema,
  maybeSession: Schema.Option(RoomPlayerSession),
  userGameText: Schema.String,
  charsTyped: Schema.Number,
  username: Schema.String,
  isRoomIdCopyIndicatorVisible: Schema.Boolean,
  exitCountdownSecondsLeft: Schema.Number,
})
export type Model = typeof Model.Type

export const capturesKeyboard = (model: Model): boolean => {
  const isRoomPlayable = Option.exists(
    AsyncData.getData(model.roomAsyncData),
    ({ status }) => status._tag === 'Waiting' || status._tag === 'Finished',
  )

  return Option.isSome(model.maybeSession) && isRoomPlayable
}
