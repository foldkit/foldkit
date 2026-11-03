import { Array, Option, pipe } from 'effect'

import { FetchRoom, LoadSession } from './command'
import { RoomComposition } from './composition'
import { Model, RoomAsyncData } from './model'

export const init = RoomComposition.makeInit(
  (maybeRoomId: Option.Option<string>) => {
    const commands = pipe(
      maybeRoomId,
      Option.map(roomId => [LoadSession({ roomId }), FetchRoom({ roomId })]),
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
  },
)
