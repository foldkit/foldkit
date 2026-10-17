import {
  AsyncCounterDemoComposition,
  EffectsLayer,
  init,
  update,
  view,
} from './asyncCounterDemo'

export const block = AsyncCounterDemoComposition.makeBlock({
  init,
  update,
  view,
  EffectsLayer,
})
