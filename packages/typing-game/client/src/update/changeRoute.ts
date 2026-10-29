import { Option } from 'effect'
import { Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeNoopStep } from '../definition'
import { type Model } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'
import { initRoomStep } from '../steps'

const clearRoomInstanceStep = makeFieldsStep(() => ({
  maybeRoomInstance: () => Option.none(),
}))

const keepRoomInstanceStep = makeNoopStep()

export const changeRoute = (model: Model, url: Url.Url) => {
  const route = urlToApplicationRoute(url)
  const routeChanged = modifyFields(model, { route: () => route })

  return ApplicationRoute.match(route, {
    Home: () => clearRoomInstanceStep(routeChanged),
    Room: ({ roomId }) =>
      Option.match(model.maybeRoomInstance, {
        onNone: () => initRoomStep(routeChanged, roomId),
        onSome: roomInstance =>
          roomInstance.roomId === roomId
            ? keepRoomInstanceStep(routeChanged)
            : initRoomStep(routeChanged, roomId),
      }),
    NotFound: () => clearRoomInstanceStep(routeChanged),
  })
}
