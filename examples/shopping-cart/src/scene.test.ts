import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { products } from './data/products'
import { Cart } from './domain'
import { type Model, update, view } from './main'
import { Products } from './page'
import { CartRoute, CheckoutRoute, NotFoundRoute, ProductsRoute } from './route'

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const baseModel: Model = {
  route: ProductsRoute({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: Products.init(products),
}

const withCart = (cart: Cart.Cart, overrides: Partial<Model> = {}): Model => ({
  ...baseModel,
  cart,
  ...overrides,
})

describe('view', () => {
  test('the nav bar lists every section', () => {
    Scene.scene(
      { update, view },
      Scene.with(baseModel),
      Scene.expect(Scene.role('link', { name: 'Products' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Cart' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Checkout' })).toExist(),
    )
  })

  test('the Cart link displays the item count when the cart has items', () => {
    Scene.scene(
      { update, view },
      Scene.with(
        withCart([
          { item: apple, quantity: 2 },
          { item: banana, quantity: 3 },
        ]),
      ),
      Scene.expect(Scene.role('link', { name: 'Cart (5)' })).toExist(),
    )
  })

  test('the Products route lists every product with an Add to Cart button', () => {
    Scene.scene(
      { update, view },
      Scene.with(baseModel),
      Scene.expect(Scene.role('heading', { name: 'Products' })).toExist(),
      Scene.expect(Scene.text('Apple')).toExist(),
      Scene.expect(Scene.text('Banana')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Add to Cart' })).toExist(),
    )
  })

  test('the Cart route shows the empty state when no items have been added', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...baseModel,
        route: CartRoute(),
      }),
      Scene.expect(Scene.role('heading', { name: 'Shopping Cart' })).toExist(),
      Scene.expect(Scene.text('Your cart is empty')).toExist(),
    )
  })

  test('the Cart route renders items and the running total', () => {
    Scene.scene(
      { update, view },
      Scene.with(
        withCart([{ item: apple, quantity: 2 }], { route: CartRoute() }),
      ),
      Scene.expect(Scene.text('Apple')).toExist(),
      Scene.expect(Scene.text('$1.50 each')).toExist(),
      Scene.expect(Scene.text('$3.00')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Remove' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Clear Cart' })).toExist(),
    )
  })

  test('the Checkout route shows the empty state when the cart is empty', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...baseModel,
        route: CheckoutRoute(),
      }),
      Scene.expect(Scene.role('heading', { name: 'Checkout' })).toExist(),
      Scene.expect(Scene.text('Your cart is empty')).toExist(),
    )
  })

  test('the Checkout route renders the order summary and a Place Order button', () => {
    Scene.scene(
      { update, view },
      Scene.with(
        withCart([{ item: apple, quantity: 2 }], {
          route: CheckoutRoute(),
        }),
      ),
      Scene.expect(Scene.role('heading', { name: 'Order Summary' })).toExist(),
      Scene.expect(Scene.text('× 2')).toExist(),
      Scene.expect(Scene.text('$3.00')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Place Order' })).toExist(),
    )
  })

  test('placing an order swaps the form for the success panel', () => {
    Scene.scene(
      { update, view },
      Scene.with(
        withCart([{ item: apple, quantity: 1 }], {
          route: CheckoutRoute(),
        }),
      ),
      Scene.click(Scene.role('button', { name: 'Place Order' })),
      Scene.expect(
        Scene.role('heading', { name: 'Order placed successfully!' }),
      ).toExist(),
    )
  })

  test('an unmatched route renders 404 NotFound', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...baseModel,
        route: NotFoundRoute({ path: '/oops' }),
      }),
      Scene.expect(
        Scene.role('heading', { name: '404 - Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/oops" was not found.')).toExist(),
    )
  })
})
