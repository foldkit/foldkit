import type { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'
import type { Flags } from './flags'
import { urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit(
  (flags: Flags, url: Url) => ({
    childInitContext: flags,
    model: {
      route: urlToApplicationRoute(url),
    },
  }),
)
