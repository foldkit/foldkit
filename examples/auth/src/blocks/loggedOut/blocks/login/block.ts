import { Effect } from 'effect'

import { LoginBlock } from './definition'
import { EffectsLayer, init, update } from './login'
import { view } from './view'

export const layer = LoginBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
)

export { LoginBlock } from './definition'
