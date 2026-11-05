import { Model } from './block'
import { AsyncCounterDemoComposition } from './composition'

export const init = AsyncCounterDemoComposition.makeInit(() => ({
  model: Model.make({
    count: 0,
    isResetting: false,
    resetDuration: 2,
    phase: 'Idle',
    generation: 0,
    messageLog: [],
  }),
}))
