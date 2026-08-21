import { Array, Match as M } from 'effect'
import { Command, Runtime, Url } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'
import { RoomsClient } from './rpc'

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  void,
  RoomsClient
> = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const homeInitResult = Home.init()
  const roomInitResult = Room.init(route)

  const commands: ReadonlyArray<Command.Command<Message, never, RoomsClient>> =
    M.value(route).pipe(
      M.withReturnType<
        ReadonlyArray<Command.Command<Message, never, RoomsClient>>
      >(),
      M.tagsExhaustive({
        Home: () =>
          Command.mapMessages(homeInitResult.commands ?? [], message =>
            Message.GotHomeMessage({ message }),
          ),
        Room: () =>
          Command.mapMessages(roomInitResult.commands ?? [], message =>
            Message.GotRoomMessage({ message }),
          ),
        NotFound: () => [],
      }),
    )

  const model = {
    route,
    home: homeInitResult.model,
    room: roomInitResult.model,
  }
  return Array.match(commands, {
    onEmpty: () => ({ model }),
    onNonEmpty: commands => ({ model, commands }),
  })
}
