import { Option } from 'effect'
import { Url } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'
import { modifyFields } from 'foldkit/struct'

import { RoomBinding } from '../composition'
import { ApplicationDefinition } from '../definition'
import { type Model } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'

const clearRoomInstance = ApplicationDefinition.makeFieldsStep(() => ({
  maybeRoomInstance: () => Option.none(),
}))

const keepRoomInstance = ApplicationDefinition.makeNoopStep()

export const initRoom = (model: typeof Model.Type, roomId: string) =>
  initAndSet(RoomBinding, model, {
    key: roomId,
    args: [Option.some(roomId)],
  })

export const changeRoute = (model: typeof Model.Type, url: Url.Url) => {
  const route = urlToApplicationRoute(url)
  const routeChanged = modifyFields(model, { route: () => route })

  return ApplicationRoute.match(route, {
    Home: () => clearRoomInstance(routeChanged),
    Room: ({ roomId }) =>
      Option.match(model.maybeRoomInstance, {
        onNone: () => initRoom(routeChanged, roomId),
        onSome: roomInstance =>
          roomInstance.roomId === roomId
            ? keepRoomInstance(routeChanged)
            : initRoom(routeChanged, roomId),
      }),
    NotFound: () => clearRoomInstance(routeChanged),
  })
}
