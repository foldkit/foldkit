import { Match, Option, Schema as S } from 'effect'

import * as Shared from '@typing-game/shared'

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

export const capturesKeyboard = (model: Model): boolean => {
  const isRoomPlayable = Match.value(model.roomRemoteData).pipe(
    Match.tag('Ok', ({ data }) =>
      Match.value(data.status).pipe(
        Match.tag('Waiting', 'Finished', () => true),
        Match.orElse(() => false),
      ),
    ),
    Match.orElse(() => false),
  )

  return Option.isSome(model.maybeSession) && isRoomPlayable
}
