import { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'
import * as Route from './route'

export const init = ApplicationComposition.makeInit((url: Url) => ({
  model: {
    route: Route.urlToApplicationRoute(url),
  },
}))
