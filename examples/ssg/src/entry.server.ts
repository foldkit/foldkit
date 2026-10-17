import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import {
  ApplicationComposition,
  EffectsLayer,
  init,
  update,
  view,
} from './application'

export const renderDocument = Server.renderDocument

export const prerenderPaths: ReadonlyArray<string> = ['/', '/about']

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      ApplicationComposition,
      { init, update, view, EffectsLayer, routing: {} },
      { url: request.url },
    ).pipe(Effect.map(Server.Rendered)),
  )
