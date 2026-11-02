import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Application, ApplicationLive } from './runRoutedApplication'

export const renderPage = (request: Request) =>
  Effect.runPromise(
    Server.renderToString(
      Application,
      { layer: ApplicationLive },
      { url: request.url },
    ),
  )
