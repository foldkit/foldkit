import { Layer } from 'effect'

import { ApplicationBlock } from './block'
import { Counter } from './blocks'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer,
}).pipe(Layer.provide(Layer.mergeAll(Counter.layer)))
