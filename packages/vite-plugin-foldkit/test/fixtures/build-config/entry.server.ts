import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import {
  ApplicationComposition,
  Flags,
  init,
  update,
  view,
} from './application'

export const renderDocument = Server.renderDocument

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      ApplicationComposition,
      { init, update, view, Flags },
      { flags: { start: 0 } },
    ).pipe(Effect.map(Server.Rendered)),
  )
