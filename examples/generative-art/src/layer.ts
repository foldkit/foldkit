import { Effect, Layer } from 'effect'

import { Slider } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { ApplicationComposition } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
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
      subscriptions,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Slider.layer)))
