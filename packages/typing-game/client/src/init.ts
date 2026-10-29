import { Option } from 'effect'
import { Url } from 'foldkit'

import { ApplicationComposition } from './composition'
import { makeStep } from './definition'
import { ApplicationRoute, urlToApplicationRoute } from './route'
import { initRoomStep } from './steps'

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
        Room: ({ roomId }) => [makeStep(model => initRoomStep(model, roomId))],
      },
      () => [],
    ),
  }
})
