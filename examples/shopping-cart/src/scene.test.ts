import { Option } from 'effect'
import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { products } from './data/products'
import { type Model, update, view } from './main'
import { Products } from './page'
import { AppRoute } from './route'

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const baseModel: Model = {
  route: AppRoute.Products({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: Products.init(products),
}

describe('view', () => {
  test('the nav bar lists every section', () => {
    scene(
      { update, view },
      given(baseModel),
      expect(role('link', { name: 'Products' })).toExist(),
      expect(role('link', { name: 'Cart' })).toExist(),
      expect(role('link', { name: 'Checkout' })).toExist(),
    )
  })

  test('the Cart link displays the item count when the cart has items', () => {
    scene(
      { update, view },
      given(
        evo(baseModel, {
          cart: () => [
            { item: apple, quantity: 2 },
            { item: banana, quantity: 3 },
          ],
        }),
      ),
      expect(role('link', { name: 'Cart (5)' })).toExist(),
    )
  })

  test('the Products route renders the Products heading', () => {
    scene(
      { update, view },
      given(baseModel),
      expect(role('heading', { name: 'Products' })).toExist(),
    )
  })

  test('the Cart route shows the empty state when no items have been added', () => {
    scene(
      { update, view },
      given(evo(baseModel, { route: () => AppRoute.Cart() })),
      expect(role('heading', { name: 'Shopping Cart' })).toExist(),
      expect(text('Your cart is empty')).toExist(),
    )
  })

  test('the Cart route renders items and the running total', () => {
    scene(
      { update, view },
      given(
        evo(baseModel, {
          cart: () => [{ item: apple, quantity: 2 }],
          route: () => AppRoute.Cart(),
        }),
      ),
      expect(text('Apple')).toExist(),
      expect(text('$1.50 each')).toExist(),
      expect(text('$3.00')).toExist(),
      expect(role('button', { name: 'Remove' })).toExist(),
      expect(role('button', { name: 'Clear Cart' })).toExist(),
    )
  })

  test('the Checkout route shows the empty state when the cart is empty', () => {
    scene(
      { update, view },
      given(evo(baseModel, { route: () => AppRoute.Checkout() })),
      expect(role('heading', { name: 'Checkout' })).toExist(),
      expect(text('Your cart is empty')).toExist(),
    )
  })

  test('the Checkout route renders the order summary and a Place Order button', () => {
    scene(
      { update, view },
      given(
        evo(baseModel, {
          cart: () => [{ item: apple, quantity: 2 }],
          route: () => AppRoute.Checkout(),
        }),
      ),
      expect(role('heading', { name: 'Order Summary' })).toExist(),
      expect(text('× 2')).toExist(),
      expect(text('$3.00')).toExist(),
      expect(role('button', { name: 'Place Order' })).toExist(),
    )
  })

  test('placing an order swaps the form for the success panel', () => {
    scene(
      { update, view },
      given(
        evo(baseModel, {
          cart: () => [{ item: apple, quantity: 1 }],
          route: () => AppRoute.Checkout(),
        }),
      ),
      click(role('button', { name: 'Place Order' })),
      expect(role('heading', { name: 'Order placed successfully!' })).toExist(),
    )
  })

  test('an unmatched route renders 404 NotFound', () => {
    scene(
      { update, view },
      given(
        evo(baseModel, { route: () => AppRoute.NotFound({ path: '/oops' }) }),
      ),
      expect(role('heading', { name: '404 - Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
    )
  })
})
