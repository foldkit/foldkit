import { Effect, Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { PlaceOrder } from './command'
import { ApplicationComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
      EffectsLayer: PlaceOrder.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(RadioGroup.layer)))
