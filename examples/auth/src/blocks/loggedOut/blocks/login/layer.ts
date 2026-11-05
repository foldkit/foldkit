import { Effect } from 'effect'

import { LoginBlock } from './block'
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
