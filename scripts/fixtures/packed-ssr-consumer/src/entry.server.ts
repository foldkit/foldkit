import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Flags, init, view } from './main'

export const buildId = import.meta.env.FOLDKIT_BUILD_ID

export const renderPage = (): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { Flags, init, view },
      { flags: { start: 0 }, buildId },
    ).pipe(Effect.map(rendered => Server.Rendered(rendered))),
  )

export const renderHtml = (template: string): Promise<string> =>
  Effect.runPromise(
    Server.renderToString(
      { Flags, init, view },
      { flags: { start: 0 }, buildId },
    ).pipe(
      Effect.map(rendered =>
        Server.toResponse(template, Server.Rendered(rendered)),
      ),
      Effect.flatMap(response => Effect.promise(() => response.text())),
    ),
  )

export const renderWithoutBuildIdTag = (): Promise<string> =>
  Effect.runPromise(
    Effect.map(
      // NOTE: no buildId, which the types refuse and the runtime has to catch
      // for a JavaScript caller. Vite does not typecheck, so this reaches the
      // check it is written for.
      Effect.flip(
        Server.renderToString({ Flags, init, view }, { flags: { start: 0 } }),
      ),
      error => error._tag,
    ),
  )
