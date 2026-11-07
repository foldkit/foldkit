import { Effect, Layer } from 'effect'

import { ApplicationBlock } from './block'
import { Products } from './blocks'
import { ApplicationComposition } from './composition'
import { EffectsLayer } from './effectsLayer'
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
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Products.layer))
