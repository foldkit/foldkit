import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { readCountCookie } from './cookie'
import { Flags, init, view } from './main'

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
})

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { Flags, init, view },
        {
          flags: flagsForRequest(request),
          buildId: import.meta.env.FOLDKIT_BUILD_ID,
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
