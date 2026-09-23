import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Flags, init, view } from './main'

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString({ Flags, init, view }, { flags: { start: 0 } }).pipe(
      Effect.map(Server.Rendered),
    ),
  )
