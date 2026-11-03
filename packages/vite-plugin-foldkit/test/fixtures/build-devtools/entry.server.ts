import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock } from './application'

export const renderDocument = Server.renderDocument
export const prerenderPaths = ['/']

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(ApplicationBlock, {}, {}).pipe(
      Effect.map(Server.Rendered),
    ),
  )
