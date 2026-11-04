import { Effect } from 'effect'

import { EffectsLayer, init, update, view } from './asyncCounterDemo'
import { AsyncCounterDemoBlock } from './definition'

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

export { AsyncCounterDemoBlock }
