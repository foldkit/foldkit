import { Array, Layer, Option, pipe } from 'effect'
import { Command, type Update } from 'foldkit'

import { AppRoute } from '../../route'
import { CommandsLayer, FetchRoom, LoadSession } from './command'
import { Message } from './message'
import { Model, RoomAsyncData } from './model'

type Requirements = Layer.Success<typeof CommandsLayer>
export type InitReturn = Update.Return<Model, Message, Requirements>
export const init = (route: AppRoute): InitReturn => {
  const commands: ReadonlyArray<Command.Command<Message, never, Requirements>> =
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
