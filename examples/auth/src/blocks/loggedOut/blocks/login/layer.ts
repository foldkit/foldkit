import { LoginBlock } from './block'
import { EffectsLayer, init, update } from './login'
import { view } from './view'

export const layer = LoginBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer,
})
