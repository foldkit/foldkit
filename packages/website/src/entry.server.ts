import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Flags } from './flags'
import { ApplicationBlock, layer } from './index'
import { loadFlagsForRequest } from './server/flags'

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  const flags = await loadFlagsForRequest(request)
  const application = await Effect.runPromise(
    Server.renderToString(
      { block: ApplicationBlock, layer },
      { Flags, routing: {} },
      { url: request.url, flags },
    ),
  )

  return Server.Rendered(application)
}
