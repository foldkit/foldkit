import { AsyncCounterDemoBlock } from './block'
import { DelayAdvanceAsyncCounterPhase } from './command'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = AsyncCounterDemoBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: DelayAdvanceAsyncCounterPhase.layer,
})
