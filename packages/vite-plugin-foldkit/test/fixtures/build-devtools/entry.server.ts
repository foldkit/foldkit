import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock, layer } from './application'

export const renderDocument = Server.renderDocument
export const prerenderPaths = ['/']

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString({ block: ApplicationBlock, layer }, {}, {}).pipe(
      Effect.map(Server.Rendered),
    ),
  )
