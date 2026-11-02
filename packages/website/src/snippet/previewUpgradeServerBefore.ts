// Before: the server rendered the completed root Block.
import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock } from './block'
import { Flags, flagsForRequest } from './flags'

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        ApplicationBlock,
        { Flags },
        { flags: flagsForRequest(request) },
      )

      return Server.Rendered(renderedApplication)
    }),
  )
