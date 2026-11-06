import { Effect } from 'effect'

import { AsyncCounterDemoBlock } from './block'
import { DelayAdvanceAsyncCounterPhase } from './command'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = AsyncCounterDemoBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: DelayAdvanceAsyncCounterPhase.layer,
    }
  }),
)
