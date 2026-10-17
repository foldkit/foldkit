import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Flags, init, view } from './main'
import { loadFlagsForRequest } from './server/flags'

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  const flags = await loadFlagsForRequest(request)
  const application = await Effect.runPromise(
    Server.renderToString(
      { Flags, routing: {}, init, view },
      { url: request.url, flags },
    ),
  )

  return Server.Rendered(application)
}
