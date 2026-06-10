import { Array, Match as M } from 'effect'
import { Url } from 'foldkit'

import { Command, LiftHome, LiftRoom } from './command'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

export type InitReturn = [Model, ReadonlyArray<Command>]

export const init = (url: Url.Url): InitReturn => {
  const route = urlToAppRoute(url)

  const [home, homeCommands] = Home.init()
  const [room, roomCommands] = Room.init(route)

  const commands = M.value(route).pipe(
    M.withReturnType<ReadonlyArray<Command>>(),
    M.tagsExhaustive({
      Home: () => Array.map(homeCommands, command => LiftHome({ command })),
      Room: () => Array.map(roomCommands, command => LiftRoom({ command })),
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
