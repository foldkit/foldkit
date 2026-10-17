import { Option } from 'effect'
import { Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { RoomBinding } from '../composition'
import { type Model, RoomInstance } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'

export const initRoom = (model: Model, roomId: string) => {
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

export const changeRoute = (model: Model, url: Url.Url) => {
  const route = urlToApplicationRoute(url)
  const routeChanged = modifyFields(model, { route: () => route })

  return ApplicationRoute.match(route, {
    Home: () => ({
      model: modifyFields(routeChanged, {
        maybeRoomInstance: () => Option.none(),
      }),
    }),
    Room: ({ roomId }) =>
      Option.match(model.maybeRoomInstance, {
        onNone: () => initRoom(routeChanged, roomId),
        onSome: roomInstance =>
          roomInstance.roomId === roomId
            ? { model: routeChanged }
            : initRoom(routeChanged, roomId),
      }),
    NotFound: () => ({
      model: modifyFields(routeChanged, {
        maybeRoomInstance: () => Option.none(),
      }),
    }),
  })
}
