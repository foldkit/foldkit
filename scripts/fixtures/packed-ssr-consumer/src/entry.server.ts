import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Flags, init, view } from './main'

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString({ Flags, init, view }, { flags: { start: 0 } }).pipe(
      Effect.map(rendered => Server.Rendered(rendered)),
    ),
  )

export const renderWithEmptyBuildId = (): Promise<string> =>
  Effect.runPromise(
    Effect.map(
      Effect.flip(
        Server.renderToString(
          { Flags, init, view },
          { flags: { start: 0 }, buildId: '' },
        ),
      ),
      error => error._tag,
    ),
  )
