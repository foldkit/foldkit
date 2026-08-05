import { Effect } from 'effect'
import * as Server from 'foldkit/experimental/server'

import { readCountCookie } from './cookie'
import { Flags, init, view } from './main'

const flagsForRequest = (cookieHeader: string): Flags => ({
  initialCount: readCountCookie(cookieHeader),
  renderedAt: new Date().toISOString(),
  renderedOn: 'Server',
})

// NOTE: request Flags are serialized with the rendered application, so the
// hydrating client calls init with the exact values this render used.
export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { Flags, init, view },
      { flags: flagsForRequest(request.headers.get('cookie') ?? '') },
    ).pipe(
      Effect.map(application =>
        Server.Rendered(application, {
          headers: {
            'cache-control': 'private, no-store',
            vary: 'cookie',
          },
        }),
      ),
    ),
  )
