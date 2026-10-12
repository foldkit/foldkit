import { Array, Option, pipe } from 'effect'

import { AppRoute } from '../../route'
import { FetchRoom, LoadSession } from './command'
import { Model, RoomAsyncData } from './model'

export const init = (route: AppRoute) => {
  const commands = pipe(
    route,
    Option.liftPredicate(route => route._tag === 'Room'),
    Option.map(({ roomId }) => [
      LoadSession({ roomId }),
      FetchRoom({ roomId }),
    ]),
    Array.fromOption,
    Array.flatten,
  )
  return {
    model: Model.make({
      roomAsyncData: RoomAsyncData.Idle(),
      maybeSession: Option.none(),
      userGameText: '',
      charsTyped: 0,
      username: '',
      isRoomIdCopyIndicatorVisible: false,
      exitCountdownSecondsLeft: 0,
    }),
    commands,
  }
}
