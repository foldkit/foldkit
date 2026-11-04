import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock, layer } from './block'
import { readCountCookie } from './cookie'
import { Flags } from './flags'

export const renderDocument = Server.renderDocument

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
})

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { block: ApplicationBlock, layer },
        { Flags },
        {
          flags: flagsForRequest(request),
        },
      )

      return Server.Rendered(renderedApplication, {
        headers: {
          'cache-control': 'private, no-store',
          vary: 'cookie',
        },
      })
    }),
  )
