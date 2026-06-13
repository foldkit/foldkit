import { Option } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { products } from './data/products'
import {
  ChangedUrl,
  ClickedClearCart,
  ClickedPlaceOrder,
  ClickedQuantityChange,
  ClickedRemoveCartItem,
  GotProductsMessage,
  type Model,
  UpdatedDeliveryInstructions,
  update,
} from './main'
import { Products } from './page'
import { ProductsRoute } from './route'

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const baseModel: Model = {
  route: ProductsRoute({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: Products.init(products),
}

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    test('root URL maps to Products with no search', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        Story.model(model => {
          expect(model.route._tag).toBe('Products')
        }),
      )
    })

    test('/cart maps to Cart', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(ChangedUrl({ url: urlOrThrow('http://localhost/cart') })),
        Story.model(model => {
          expect(model.route._tag).toBe('Cart')
        }),
      )
    })

    test('/checkout maps to Checkout', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/checkout') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Checkout')
        }),
      )
    })

    test('an unmatched path falls back to NotFound', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(ChangedUrl({ url: urlOrThrow('http://localhost/wat') })),
        Story.model(model => {
          if (model.route._tag === 'NotFound') {
            expect(model.route.path).toBe('/wat')
          } else {
            throw new Error('Expected NotFound')
          }
        }),
      )
    })
  })

  describe('cart updates', () => {
    test('Products.AddedToCart OutMessage adds the item with quantity one', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(
          GotProductsMessage({
            message: Products.ClickedAddToCart({ item: apple }),
          }),
        ),
        Story.model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.item.id).toBe('1')
          expect(model.cart[0]?.quantity).toBe(1)
        }),
      )
    })

    test('adding the same item twice increments its quantity', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(
          GotProductsMessage({
            message: Products.ClickedAddToCart({ item: apple }),
          }),
        ),
        Story.message(
          GotProductsMessage({
            message: Products.ClickedAddToCart({ item: apple }),
          }),
        ),
        Story.model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.quantity).toBe(2)
        }),
      )
    })

    test('ClickedQuantityChange replaces the quantity for an item', () => {
      Story.story(
        update,
        Story.with({
          ...baseModel,
          cart: [{ item: apple, quantity: 1 }],
        }),
        Story.message(ClickedQuantityChange({ itemId: '1', quantity: 5 })),
        Story.model(model => {
          expect(model.cart[0]?.quantity).toBe(5)
        }),
      )
    })

    test('ClickedRemoveCartItem drops the matching cart entry', () => {
      Story.story(
        update,
        Story.with({
          ...baseModel,
          cart: [
            { item: apple, quantity: 2 },
            { item: banana, quantity: 1 },
          ],
        }),
        Story.message(ClickedRemoveCartItem({ itemId: '1' })),
        Story.model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.item.id).toBe('2')
        }),
      )
    })

    test('ClickedClearCart empties the cart', () => {
      Story.story(
        update,
        Story.with({
          ...baseModel,
          cart: [{ item: apple, quantity: 2 }],
        }),
        Story.message(ClickedClearCart()),
        Story.model(model => {
          expect(model.cart).toHaveLength(0)
        }),
      )
    })
  })

  describe('checkout', () => {
    test('UpdatedDeliveryInstructions stores the value', () => {
      Story.story(
        update,
        Story.with(baseModel),
        Story.message(
          UpdatedDeliveryInstructions({ value: 'Leave at the door' }),
        ),
        Story.model(model => {
          expect(model.deliveryInstructions).toBe('Leave at the door')
        }),
      )
    })

    test('ClickedPlaceOrder sets orderPlaced, clears the cart, and resets instructions', () => {
      Story.story(
        update,
        Story.with({
          ...baseModel,
          cart: [{ item: apple, quantity: 2 }],
          deliveryInstructions: 'Knock loudly',
        }),
        Story.message(ClickedPlaceOrder()),
        Story.model(model => {
          expect(model.orderPlaced).toBe(true)
          expect(model.cart).toHaveLength(0)
          expect(model.deliveryInstructions).toBe('')
        }),
      )
    })
  })
})
