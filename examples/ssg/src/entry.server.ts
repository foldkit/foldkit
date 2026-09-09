import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { init, view } from './main'

export const prerenderPaths: ReadonlyArray<string> = ['/', '/about']

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { routing: {}, init, view },
      { url: request.url, buildId: import.meta.env.FOLDKIT_BUILD_ID },
    ).pipe(Effect.map(Server.Rendered)),
  )
