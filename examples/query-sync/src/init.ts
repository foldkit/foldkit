import { type Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'
import { urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)

  return {
    model: { route },
  }
})
