import { Effect } from 'effect'

import { ProductsDefinition } from './definition'
import { ReplaceSearchUrl, init, update } from './products'
import { view } from './view'

export const ProductsBlock = ProductsDefinition.contract

export const layer = ProductsDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: ReplaceSearchUrl.layer,
    }
  }),
).layer
