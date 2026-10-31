import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Application, ApplicationLive, Flags } from './application'

export const renderDocument = Server.renderDocument

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      Application,
      { layer: ApplicationLive, Flags },
      { flags: { start: 0 } },
    ).pipe(Effect.map(Server.Rendered)),
  )
