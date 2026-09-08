import { Option } from 'effect'
import { given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { products } from './data/products'
import { Message, type Model, update } from './main'
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

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    test('root URL maps to Products with no search', () => {
      story(
        update,
        given(baseModel),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Products')
        }),
      )
    })

    test('/cart maps to Cart', () => {
      story(
        update,
        given(baseModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/cart') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Cart')
        }),
      )
    })

    test('/checkout maps to Checkout', () => {
      story(
        update,
        given(baseModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/checkout') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Checkout')
        }),
      )
    })

    test('an unmatched path falls back to NotFound', () => {
      story(
        update,
        given(baseModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/wat') }),
        ),
        model(model => {
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
      story(
        update,
        given(baseModel),
        message(
          Message.GotProductsMessage({
            message: Products.Message.ClickedAddToCart({ item: apple }),
          }),
        ),
        model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.item.id).toBe('1')
          expect(model.cart[0]?.quantity).toBe(1)
        }),
      )
    })

    test('adding the same item twice increments its quantity', () => {
      story(
        update,
        given(baseModel),
        message(
          Message.GotProductsMessage({
            message: Products.Message.ClickedAddToCart({ item: apple }),
          }),
        ),
        message(
          Message.GotProductsMessage({
            message: Products.Message.ClickedAddToCart({ item: apple }),
          }),
        ),
        model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.quantity).toBe(2)
        }),
      )
    })

    test('ClickedIncrementQuantity raises the quantity for an item', () => {
      story(
        update,
        given(
          evo(baseModel, {
            cart: () => [{ item: apple, quantity: 1 }],
          }),
        ),
        message(Message.ClickedIncrementQuantity({ itemId: '1' })),
        model(model => {
          expect(model.cart[0]?.quantity).toBe(2)
        }),
      )
    })

    test('ClickedDecrementQuantity lowers the quantity for an item', () => {
      story(
        update,
        given(
          evo(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
          }),
        ),
        message(Message.ClickedDecrementQuantity({ itemId: '1' })),
        model(model => {
          expect(model.cart[0]?.quantity).toBe(1)
        }),
      )
    })

    test('ClickedDecrementQuantity removes the item when it reaches zero', () => {
      story(
        update,
        given(
          evo(baseModel, {
            cart: () => [{ item: apple, quantity: 1 }],
          }),
        ),
        message(Message.ClickedDecrementQuantity({ itemId: '1' })),
        model(model => {
          expect(model.cart).toHaveLength(0)
        }),
      )
    })

    test('ClickedRemoveCartItem drops the matching cart entry', () => {
      story(
        update,
        given(
          evo(baseModel, {
            cart: () => [
              { item: apple, quantity: 2 },
              { item: banana, quantity: 1 },
            ],
          }),
        ),
        message(Message.ClickedRemoveCartItem({ itemId: '1' })),
        model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.item.id).toBe('2')
        }),
      )
    })

    test('ClickedClearCart empties the cart', () => {
      story(
        update,
        given(
          evo(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
          }),
        ),
        message(Message.ClickedClearCart()),
        model(model => {
          expect(model.cart).toHaveLength(0)
        }),
      )
    })
  })

  describe('checkout', () => {
    test('UpdatedDeliveryInstructions stores the value', () => {
      story(
        update,
        given(baseModel),
        message(
          Message.UpdatedDeliveryInstructions({
            value: 'Leave at the door',
          }),
        ),
        model(model => {
          expect(model.deliveryInstructions).toBe('Leave at the door')
        }),
      )
    })

    test('ClickedPlaceOrder sets orderPlaced, clears the cart, and resets instructions', () => {
      story(
        update,
        given(
          evo(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
            deliveryInstructions: () => 'Knock loudly',
          }),
        ),
        message(Message.ClickedPlaceOrder()),
        model(model => {
          expect(model.orderPlaced).toBe(true)
          expect(model.cart).toHaveLength(0)
          expect(model.deliveryInstructions).toBe('')
        }),
      )
    })
  })
})
