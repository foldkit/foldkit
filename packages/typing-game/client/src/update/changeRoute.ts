import { Option } from 'effect'
import { Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { RoomBinding } from '../composition'
import { ApplicationDefinition } from '../definition'
import { type Model, RoomInstance } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'

const clearRoomInstance = ApplicationDefinition.makeFieldsStep(() => ({
  maybeRoomInstance: () => Option.none(),
}))

const keepRoomInstance = ApplicationDefinition.makeNoopStep()

export const initRoom = (model: typeof Model.Type, roomId: string) => {
  return RoomBinding.init({
    key: roomId,
    args: [Option.some(roomId)],
    toParentModel: room =>
      modifyFields(model, {
        maybeRoomInstance: () =>
          Option.some(RoomInstance.make({ roomId, model: room })),
      }),
  })
}

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
