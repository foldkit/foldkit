import { Layer, Option } from 'effect'
import type { Resolved } from 'foldkit/block'
import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive, type Model } from './application'
import { products } from './domain/products'
import { ProductsLive } from './page/products'
import { ApplicationRoute } from './route'

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const application = ApplicationLive.pipe(Layer.provide(ProductsLive))

const startArgs = {
  url: Option.getOrThrow(fromString('http://localhost/')),
}

const baseModel: Resolved<Model> = {
  route: ApplicationRoute.Products({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: { products, searchText: '' },
}

describe('view', () => {
  it.effect('the nav bar lists every section', () =>
    scene(
      application,
      startArgs,
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
        application,
        startArgs,
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
      application,
      startArgs,
      given(baseModel),
      expect(role('heading', { name: 'Products' })).toExist(),
    ),
  )

  it.effect(
    'the Cart route shows the empty state when no items have been added',
    () =>
      scene(
        application,
        startArgs,
        given(
          modifyFields(baseModel, { route: () => ApplicationRoute.Cart() }),
        ),
        expect(role('heading', { name: 'Shopping Cart' })).toExist(),
        expect(text('Your cart is empty')).toExist(),
      ),
  )

  it.effect('the Cart route renders items and the running total', () =>
    scene(
      application,
      startArgs,
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
        application,
        startArgs,
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
        application,
        startArgs,
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
      application,
      startArgs,
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
      application,
      startArgs,
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
