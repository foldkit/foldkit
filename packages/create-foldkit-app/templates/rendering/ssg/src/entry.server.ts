import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Application, ApplicationLive } from './application'

export const renderDocument = Server.renderDocument

export const prerenderPaths: ReadonlyArray<string> = ['/', '/about']

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        Application,
        { layer: ApplicationLive },
        { url: request.url },
      )

      return Server.Rendered(renderedApplication)
    }),
  )
