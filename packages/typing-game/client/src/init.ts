import { Effect, Match as M } from 'effect'
import { Runtime, Url } from 'foldkit'

import { GotHomeMessage, GotRoomMessage } from './message'
import type { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

export const init: Runtime.ApplicationInit<Model, Message> = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const [home, homeCommands] = Home.init()
  const [room, roomCommands] = Room.init(route)

  const commands = M.value(route).pipe(
    M.tagsExhaustive({
      Home: () =>
        homeCommands.map(Effect.map(message => GotHomeMessage({ message }))),
      Room: () =>
        roomCommands.map(Effect.map(message => GotRoomMessage({ message }))),
      NotFound: () => [],
    }),
  )

  return [
    {
      route,
      home,
      room,
    },
    commands,
  ]
}
