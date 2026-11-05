import { Effect, Layer } from 'effect'

import { ApplicationBlock } from './block'
import { Products } from './blocks'
import { ProductsPageBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const products = yield* ProductsPageBinding

    return {
      children: [products],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Products.layer))
