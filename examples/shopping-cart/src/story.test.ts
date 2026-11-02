import { Effect, Option } from 'effect'
import { given, message, messageFrom, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { ProductsPageBinding } from './composition'
import { products } from './data/products'
import { Message } from './message'
import type { Model } from './model'
import { ProductsBlock } from './page'
import { ApplicationRoute } from './route'

type ProductsMessage = typeof ProductsBlock.Message.Type

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const baseModel: Model = {
  route: ApplicationRoute.Products({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: ProductsBlock.Model.make({ products, searchText: '' }),
}

const productsMessage = (message: ProductsMessage) =>
  messageFrom(ProductsPageBinding, message)

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    test('root URL maps to Products with no search', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(baseModel),
          message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
          model(model => {
            expect(model.route._tag).toBe('Products')
          }),
        ),
      )
    })

    test('/cart maps to Cart', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(baseModel),
          message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/cart') }),
          ),
          model(model => {
            expect(model.route._tag).toBe('Cart')
          }),
        ),
      )
    })

    test('/checkout maps to Checkout', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(baseModel),
          message(
            Message.ChangedUrl({
              url: urlOrThrow('http://localhost/checkout'),
            }),
          ),
          model(model => {
            expect(model.route._tag).toBe('Checkout')
          }),
        ),
      )
    })

    test('an unmatched path falls back to NotFound', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
        ),
      )
    })
  })

  describe('cart updates', () => {
    test('Products.AddedToCart OutMessage adds the item with quantity one', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(baseModel),
          productsMessage(
            ProductsBlock.Message.ClickedAddToCart({ item: apple }),
          ),
          model(model => {
            expect(model.cart).toHaveLength(1)
            expect(model.cart[0]?.item.id).toBe('1')
            expect(model.cart[0]?.quantity).toBe(1)
          }),
        ),
      )
    })

    test('adding the same item twice increments its quantity', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(baseModel),
          productsMessage(
            ProductsBlock.Message.ClickedAddToCart({ item: apple }),
          ),
          productsMessage(
            ProductsBlock.Message.ClickedAddToCart({ item: apple }),
          ),
          model(model => {
            expect(model.cart).toHaveLength(1)
            expect(model.cart[0]?.quantity).toBe(2)
          }),
        ),
      )
    })

    test('ClickedIncrementQuantity raises the quantity for an item', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(
            modifyFields(baseModel, {
              cart: () => [{ item: apple, quantity: 1 }],
            }),
          ),
          message(Message.ClickedIncrementQuantity({ itemId: '1' })),
          model(model => {
            expect(model.cart[0]?.quantity).toBe(2)
          }),
        ),
      )
    })

    test('ClickedDecrementQuantity lowers the quantity for an item', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(
            modifyFields(baseModel, {
              cart: () => [{ item: apple, quantity: 2 }],
            }),
          ),
          message(Message.ClickedDecrementQuantity({ itemId: '1' })),
          model(model => {
            expect(model.cart[0]?.quantity).toBe(1)
          }),
        ),
      )
    })

    test('ClickedDecrementQuantity removes the item when it reaches zero', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(
            modifyFields(baseModel, {
              cart: () => [{ item: apple, quantity: 1 }],
            }),
          ),
          message(Message.ClickedDecrementQuantity({ itemId: '1' })),
          model(model => {
            expect(model.cart).toHaveLength(0)
          }),
        ),
      )
    })

    test('ClickedRemoveCartItem drops the matching cart entry', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(
            modifyFields(baseModel, {
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
        ),
      )
    })

    test('ClickedClearCart empties the cart', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(
            modifyFields(baseModel, {
              cart: () => [{ item: apple, quantity: 2 }],
            }),
          ),
          message(Message.ClickedClearCart()),
          model(model => {
            expect(model.cart).toHaveLength(0)
          }),
        ),
      )
    })
  })

  describe('checkout', () => {
    test('UpdatedDeliveryInstructions stores the value', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(baseModel),
          message(
            Message.UpdatedDeliveryInstructions({
              value: 'Leave at the door',
            }),
          ),
          model(model => {
            expect(model.deliveryInstructions).toBe('Leave at the door')
          }),
        ),
      )
    })

    test('ClickedPlaceOrder sets orderPlaced, clears the cart, and resets instructions', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(
            modifyFields(baseModel, {
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
        ),
      )
    })
  })
})
