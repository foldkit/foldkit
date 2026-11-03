import { Effect } from 'effect'

import { EffectsLayer, init, update, view } from './asyncCounterDemo'
import { AsyncCounterDemoDefinition } from './definition'

export const AsyncCounterDemoBlock = AsyncCounterDemoDefinition.contract

const block = AsyncCounterDemoDefinition.makeBlock(
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
export const layer = block.layer
