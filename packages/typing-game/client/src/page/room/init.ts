import { Array, Option, pipe } from 'effect'
import { Command } from 'foldkit'

import { AppRoute } from '../../route'
import { getRoomById, loadSessionFromStorage } from './command'
import { Message } from './message'
import { Model, RoomRemoteData } from './model'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]
export const init = (route: AppRoute): InitReturn => {
  const commands = pipe(
    route,
    Option.liftPredicate(route => route._tag === 'Room'),
    Option.map(({ roomId }) => [
      loadSessionFromStorage(roomId),
      getRoomById(roomId),
    ]),
    Array.fromOption,
    Array.flatten,
  )
  return [
    {
      roomRemoteData: RoomRemoteData.Idle(),
      maybeSession: Option.none(),
      userGameText: '',
      charsTyped: 0,
      username: '',
      isRoomIdCopyIndicatorVisible: false,
      exitCountdownSecondsLeft: 0,
    },
    commands,
  ]
}
