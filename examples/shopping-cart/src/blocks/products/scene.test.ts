import { Effect } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { products } from '../../data/products'
import { ProductsBlock, layer } from './index'

describe('products', () => {
  it.effect('lists every product with an Add to Cart button', () =>
    Scene.scene(
      { block: ProductsBlock, viewInputs: { cart: [] } },
      Scene.init(products),
      Scene.expect(Scene.role('heading', { name: 'Products' })).toExist(),
      Scene.expect(Scene.text('Apple')).toExist(),
      Scene.expect(Scene.text('Banana')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Add to Cart' })).toExist(),
    ).pipe(Effect.provide(layer)),
  )
})
