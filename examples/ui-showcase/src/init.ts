import { ApplicationComposition } from './composition'
import { urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit((flags, url) => ({
  childInitContext: flags,
  model: {
    route: urlToApplicationRoute(url),
  },
}))
