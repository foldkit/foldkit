import { Option } from 'effect'
import { Url } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'
import { modifyFields } from 'foldkit/struct'

import { RoomBinding } from '../composition'
import { makeFieldsStep, makeNoopStep } from '../definition'
import { type Model } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'

const clearRoomInstanceStep = makeFieldsStep(() => ({
  maybeRoomInstance: () => Option.none(),
}))

const keepRoomInstanceStep = makeNoopStep()

export const initRoom = (model: typeof Model.Type, roomId: string) =>
  initAndSet(RoomBinding, model, {
    key: roomId,
    args: [Option.some(roomId)],
  })

export const changeRoute = (model: typeof Model.Type, url: Url.Url) => {
  const route = urlToApplicationRoute(url)
  const routeChanged = modifyFields(model, { route: () => route })

  return ApplicationRoute.match(route, {
    Home: () => clearRoomInstanceStep(routeChanged),
    Room: ({ roomId }) =>
      Option.match(model.maybeRoomInstance, {
        onNone: () => initRoom(routeChanged, roomId),
        onSome: roomInstance =>
          roomInstance.roomId === roomId
            ? keepRoomInstanceStep(routeChanged)
            : initRoom(routeChanged, roomId),
      }),
    NotFound: () => clearRoomInstanceStep(routeChanged),
  })
}
