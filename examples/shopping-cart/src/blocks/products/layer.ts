import { Effect } from 'effect'

import { ProductsBlock } from './block'
import { ReplaceSearchUrl, init, update } from './products'
import { view } from './view'

export const layer = ProductsBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: ReplaceSearchUrl.layer,
    }
  }),
)
