import { Effect } from 'effect'
import * as Server from 'foldkit/experimental/server'

import { init, view } from './main'

export const prerenderPaths: ReadonlyArray<string> = ['/', '/about']

export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { routing: {}, init, view },
      { url: request.url },
    ).pipe(Effect.map(Server.Rendered)),
  )
