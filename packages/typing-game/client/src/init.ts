import { Command, Url } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { AppRoute, urlToAppRoute } from './route'

export const init = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const homeInit = Home.init()
  const roomInit = Room.init(route)

  const commands = AppRoute.match(route, {
    Home: () =>
      Command.mapMessages(homeInit.commands, message =>
        Message.GotHomeMessage({ message }),
      ),
    Room: () =>
      Command.mapMessages(roomInit.commands, message =>
        Message.GotRoomMessage({ message }),
      ),
    NotFound: () => [],
  })

  const model = Model.make({
    route,
    home: homeInit.model,
    room: roomInit.model,
  })
  return { model, commands }
}
