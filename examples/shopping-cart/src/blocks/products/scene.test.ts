import { Effect } from 'effect'
import { expect, init, role, scene, text } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { products } from '../../data/products'
import { ProductsBlock, layer } from './block'

describe('products', () => {
  it.effect('lists every product with an Add to Cart button', () =>
    scene(
      { block: ProductsBlock, viewInputs: { cart: [] } },
      init(products),
      expect(role('heading', { name: 'Products' })).toExist(),
      expect(text('Apple')).toExist(),
      expect(text('Banana')).toExist(),
      expect(role('button', { name: 'Add to Cart' })).toExist(),
    ).pipe(Effect.provide(layer)),
  )
})
