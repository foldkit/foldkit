import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock, Flags, layer } from './application'

export const renderDocument = Server.renderDocument

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { block: ApplicationBlock, layer },
      { Flags },
      { flags: { start: 0 } },
    ).pipe(Effect.map(Server.Rendered)),
  )
