import { Array, Option, pipe } from 'effect'
import { Command, type Update } from 'foldkit'

import { AppRoute } from '../../route'
import { RoomsClient } from '../../rpc'
import { FetchRoom, LoadSession } from './command'
import { Message } from './message'
import { Model, RoomAsyncData } from './model'

export type InitReturn = Update.Return<Model, Message, RoomsClient>
export const init = (route: AppRoute): InitReturn => {
  const commands: ReadonlyArray<Command.Command<Message, never, RoomsClient>> =
    pipe(
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
    model: {
      roomAsyncData: RoomAsyncData.Idle(),
      maybeSession: Option.none(),
      userGameText: '',
      charsTyped: 0,
      username: '',
      isRoomIdCopyIndicatorVisible: false,
      exitCountdownSecondsLeft: 0,
    },
    commands,
  }
}
