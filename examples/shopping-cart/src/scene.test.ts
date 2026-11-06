import { Option } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ProductsBlock } from './blocks'
import { products } from './data/products'
import { ApplicationBlock, layer } from './index'
import type { Model } from './model'
import { ApplicationRoute } from './route'

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const baseModel: Model = {
  route: ApplicationRoute.Products({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: ProductsBlock.Model.make({ products, searchText: '' }),
}

describe('view', () => {
  it.effect('the nav bar lists every section', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(baseModel),
      Scene.expect(Scene.role('link', { name: 'Products' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Cart' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Checkout' })).toExist(),
    ),
  )

  it.effect(
    'the Cart link displays the item count when the cart has items',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(baseModel, {
            cart: () => [
              { item: apple, quantity: 2 },
              { item: banana, quantity: 3 },
            ],
          }),
        ),
        Scene.expect(Scene.role('link', { name: 'Cart (5)' })).toExist(),
      ),
  )

  it.effect('the Products route renders the Products heading', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(baseModel),
      Scene.expect(Scene.role('heading', { name: 'Products' })).toExist(),
    ),
  )

  it.effect(
    'the Cart route shows the empty state when no items have been added',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(baseModel, { route: () => ApplicationRoute.Cart() }),
        ),
        Scene.expect(
          Scene.role('heading', { name: 'Shopping Cart' }),
        ).toExist(),
        Scene.expect(Scene.text('Your cart is empty')).toExist(),
      ),
  )

  it.effect('the Cart route renders items and the running total', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(baseModel, {
          cart: () => [{ item: apple, quantity: 2 }],
          route: () => ApplicationRoute.Cart(),
        }),
      ),
      Scene.expect(Scene.text('Apple')).toExist(),
      Scene.expect(Scene.text('$1.50 each')).toExist(),
      Scene.expect(Scene.text('$3.00')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Remove' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Clear Cart' })).toExist(),
    ),
  )

  it.effect(
    'the Checkout route shows the empty state when the cart is empty',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(baseModel, { route: () => ApplicationRoute.Checkout() }),
        ),
        Scene.expect(Scene.role('heading', { name: 'Checkout' })).toExist(),
        Scene.expect(Scene.text('Your cart is empty')).toExist(),
      ),
  )

  it.effect(
    'the Checkout route renders the order summary and a Place Order button',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
            route: () => ApplicationRoute.Checkout(),
          }),
        ),
        Scene.expect(
          Scene.role('heading', { name: 'Order Summary' }),
        ).toExist(),
        Scene.expect(Scene.text('× 2')).toExist(),
        Scene.expect(Scene.text('$3.00')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Place Order' })).toExist(),
      ),
  )

  it.effect('placing an order swaps the form for the success panel', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(baseModel, {
          cart: () => [{ item: apple, quantity: 1 }],
          route: () => ApplicationRoute.Checkout(),
        }),
      ),
      Scene.click(Scene.role('button', { name: 'Place Order' })),
      Scene.expect(
        Scene.role('heading', { name: 'Order placed successfully!' }),
      ).toExist(),
    ),
  )

  it.effect('an unmatched route renders 404 NotFound', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(baseModel, {
          route: () => ApplicationRoute.NotFound({ path: '/oops' }),
        }),
      ),
      Scene.expect(
        Scene.role('heading', { name: '404 - Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/oops" was not found.')).toExist(),
    ),
  )
})
