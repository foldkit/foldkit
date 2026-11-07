import { ProductsBlock } from './block'
import { ReplaceSearchUrl, init, update } from './products'
import { view } from './view'

export const layer = ProductsBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: ReplaceSearchUrl.layer,
})
