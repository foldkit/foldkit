import { Command, type Update, Url } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { AppRoute, urlToAppRoute } from './route'

type InitRequirements = Home.UpdateRequirements | Room.UpdateRequirements
type InitCommands = Update.Commands<Message, InitRequirements>

export const init = (
  url: Url.Url,
): Update.Return<Model, Message, InitRequirements> => {
  const route = urlToAppRoute(url)

  const homeInit = Home.init()
  const roomInit = Room.init(route)

  const commands = AppRoute.match<InitCommands>(route, {
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

  const model = {
    route,
    home: homeInit.model,
    room: roomInit.model,
  }
  return { model, commands }
}
