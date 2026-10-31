import { Effect, Layer } from 'effect'
import { Server } from 'foldkit/experimental'

import { Application, ApplicationLive } from './block'
import { Flags } from './flags'
import { loadFlagsForRequest } from './server/flags'
import { ApplicationServerLayer } from './services'

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  const flags = await loadFlagsForRequest(request)
  const application = await Effect.runPromise(
    Server.renderToString(
      Application,
      {
        layer: ApplicationLive.pipe(Layer.provide(ApplicationServerLayer)),
        Flags,
      },
      { url: request.url, flags },
    ),
  )

  return Server.Rendered(application)
}
