import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock, Flags, layer } from './block'
import { PACKED_CONSUMER_HEAD, PACKED_CONSUMER_PROBE } from './document'

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: PACKED_CONSUMER_HEAD,
  }).replace('</body>', `${PACKED_CONSUMER_PROBE}</body>`)

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { block: ApplicationBlock, layer },
      { Flags },
      { flags: { start: 0 } },
    ).pipe(Effect.map(rendered => Server.Rendered(rendered))),
  )

export const renderWithEmptyBuildId = (): Promise<string> =>
  Effect.runPromise(
    Effect.map(
      Effect.flip(
        Server.renderToString(
          { block: ApplicationBlock, layer },
          { Flags },
          { flags: { start: 0 }, buildId: '' },
        ),
      ),
      error => error._tag,
    ),
  )
