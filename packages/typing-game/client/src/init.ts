import { Option } from 'effect'
import { Url } from 'foldkit'

import { makeStep } from './block'
import { ApplicationComposition } from './composition'
import { ApplicationRoute, urlToApplicationRoute } from './route'
import { initRoom } from './steps'

export const init = ApplicationComposition.makeInit((url: Url.Url) => {
  const route = urlToApplicationRoute(url)

  return {
    model: {
      route,
      maybeRoomInstance: Option.none(),
    },
    steps: ApplicationRoute.matchOrElse(
      route,
      {
        Room: ({ roomId }) => [makeStep(model => initRoom(model, roomId))],
      },
      () => [],
    ),
  }
})
