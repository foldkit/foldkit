import { Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { PlaceOrder } from './command'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: PlaceOrder.layer,
}).pipe(Layer.provide(Layer.mergeAll(RadioGroup.layer)))
