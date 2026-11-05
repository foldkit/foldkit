import { Option } from 'effect'
import { click, expect, given, role, scene, text } from 'foldkit/scene'
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
    scene(
      { block: ApplicationBlock, layer },
      given(baseModel),
      expect(role('link', { name: 'Products' })).toExist(),
      expect(role('link', { name: 'Cart' })).toExist(),
      expect(role('link', { name: 'Checkout' })).toExist(),
    ),
  )

  it.effect(
    'the Cart link displays the item count when the cart has items',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(baseModel, {
            cart: () => [
              { item: apple, quantity: 2 },
              { item: banana, quantity: 3 },
            ],
          }),
        ),
        expect(role('link', { name: 'Cart (5)' })).toExist(),
      ),
  )

  it.effect('the Products route renders the Products heading', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(baseModel),
      expect(role('heading', { name: 'Products' })).toExist(),
    ),
  )

  it.effect(
    'the Cart route shows the empty state when no items have been added',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(baseModel, { route: () => ApplicationRoute.Cart() }),
        ),
        expect(role('heading', { name: 'Shopping Cart' })).toExist(),
        expect(text('Your cart is empty')).toExist(),
      ),
  )

  it.effect('the Cart route renders items and the running total', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(baseModel, {
          cart: () => [{ item: apple, quantity: 2 }],
          route: () => ApplicationRoute.Cart(),
        }),
      ),
      expect(text('Apple')).toExist(),
      expect(text('$1.50 each')).toExist(),
      expect(text('$3.00')).toExist(),
      expect(role('button', { name: 'Remove' })).toExist(),
      expect(role('button', { name: 'Clear Cart' })).toExist(),
    ),
  )

  it.effect(
    'the Checkout route shows the empty state when the cart is empty',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(baseModel, { route: () => ApplicationRoute.Checkout() }),
        ),
        expect(role('heading', { name: 'Checkout' })).toExist(),
        expect(text('Your cart is empty')).toExist(),
      ),
  )

  it.effect(
    'the Checkout route renders the order summary and a Place Order button',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
            route: () => ApplicationRoute.Checkout(),
          }),
        ),
        expect(role('heading', { name: 'Order Summary' })).toExist(),
        expect(text('× 2')).toExist(),
        expect(text('$3.00')).toExist(),
        expect(role('button', { name: 'Place Order' })).toExist(),
      ),
  )

  it.effect('placing an order swaps the form for the success panel', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(baseModel, {
          cart: () => [{ item: apple, quantity: 1 }],
          route: () => ApplicationRoute.Checkout(),
        }),
      ),
      click(role('button', { name: 'Place Order' })),
      expect(role('heading', { name: 'Order placed successfully!' })).toExist(),
    ),
  )

  it.effect('an unmatched route renders 404 NotFound', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(baseModel, {
          route: () => ApplicationRoute.NotFound({ path: '/oops' }),
        }),
      ),
      expect(role('heading', { name: '404 - Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
    ),
  )
})
