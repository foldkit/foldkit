import { Array, Option, pipe } from 'effect'

import { AppRoute } from '../../route'
import { Command, FetchRoom, LoadSession } from './command'
import { Model, RoomRemoteData } from './model'

export type InitReturn = [Model, ReadonlyArray<Command>]
export const init = (route: AppRoute): InitReturn => {
  const commands: ReadonlyArray<Command> = pipe(
    route,
    Option.liftPredicate(route => route._tag === 'Room'),
    Option.map(({ roomId }) => [
      LoadSession({ roomId }),
      FetchRoom({ roomId }),
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
