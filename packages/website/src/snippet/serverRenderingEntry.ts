import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import {
  Application,
  ApplicationLive,
  Flags,
  readCountCookie,
} from './serverRenderingApplication'

export const renderDocument = Server.renderDocument

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
})

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        Application,
        { layer: ApplicationLive, Flags },
        { flags: flagsForRequest(request) },
      )

      return Server.Rendered(renderedApplication, {
        headers: {
          'cache-control': 'private, no-store',
          vary: 'cookie',
        },
      })
    }),
  )
