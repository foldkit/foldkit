import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { expect, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { products } from '../domain/products'
import { Products, ProductsLive } from './products'

class ProductsHost extends Block<ProductsHost>()('ProductsHost', {
  Model: Schema.Struct({ productsPage: Products }),
}) {}

const ProductsHostLive = ProductsHost.make(
  Effect.fn(function* () {
    const productsPage = yield* new Products('productsPage', { products })

    return {
      model: { productsPage },
      view: model => model.productsPage.view({ cart: [] }),
    }
  }),
)

describe('products', () => {
  it.effect('lists every product with an Add to Cart button', () =>
    scene(
      ProductsHostLive.pipe(Layer.provide(ProductsLive)),
      expect(role('heading', { name: 'Products' })).toExist(),
      expect(text('Apple')).toExist(),
      expect(text('Banana')).toExist(),
      expect(role('button', { name: 'Add to Cart' })).toExist(),
    ),
  )
})
