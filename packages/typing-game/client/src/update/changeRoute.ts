import { Option } from 'effect'
import { Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeNoopStep } from '../definition'
import { type Model } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'
import { initRoom } from '../steps'

const clearRoomInstance = makeFieldsStep(() => ({
  maybeRoomInstance: () => Option.none(),
}))

const keepRoomInstance = makeNoopStep()

export const changeRoute = (model: Model, url: Url.Url) => {
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
