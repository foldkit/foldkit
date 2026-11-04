import { Effect, Layer } from 'effect'

import { Products } from './blocks'
import { EffectsLayer } from './command'
import { ProductsPageBinding } from './composition'
import { ApplicationBlock } from './definition'
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

export { ApplicationBlock } from './definition'
