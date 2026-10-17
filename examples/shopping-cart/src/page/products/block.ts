import { ProductsComposition } from './definition'
import { ReplaceSearchUrl, init, update } from './products'
import { view } from './view'

export const block = ProductsComposition.makeBlock({
  init,
  update,
  view,
  EffectsLayer: ReplaceSearchUrl.layer,
})
