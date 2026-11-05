import { Effect } from 'effect'

import { EffectsLayer, init, update, view } from './asyncCounterDemo'
import { AsyncCounterDemoBlock } from './block'

export const layer = AsyncCounterDemoBlock.makeLayer(
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
