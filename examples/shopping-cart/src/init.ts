import type { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'
import { urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit((url: Url) => {
  return {
    model: {
      route: urlToApplicationRoute(url),
      cart: [],
      deliveryInstructions: '',
      orderPlaced: false,
    },
  }
})
