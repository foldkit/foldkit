import { Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ProductsBlock } from './blocks'
import { ProductsPageBinding } from './composition'
import { products } from './data/products'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
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

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    it.effect('root URL maps to Products with no search', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(baseModel),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Products')
        }),
      ),
    )

    it.effect('/cart maps to Cart', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(baseModel),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/cart') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Cart')
        }),
      ),
    )

    it.effect('/checkout maps to Checkout', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(baseModel),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/checkout'),
          }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Checkout')
        }),
      ),
    )

    it.effect('an unmatched path falls back to NotFound', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(baseModel),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/wat') }),
        ),
        Story.model(model => {
          if (model.route._tag === 'NotFound') {
            expect(model.route.path).toBe('/wat')
          } else {
            throw new Error('Expected NotFound')
          }
        }),
      ),
    )
  })

  describe('cart updates', () => {
    it.effect(
      'Products.AddedToCart OutMessage adds the item with quantity one',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(baseModel),
          Story.messageIn(
            ProductsPageBinding,
            ProductsBlock.Message.ClickedAddToCart({ item: apple }),
          ),
          Story.model(model => {
            expect(model.cart).toHaveLength(1)
            expect(model.cart[0]?.item.id).toBe('1')
            expect(model.cart[0]?.quantity).toBe(1)
          }),
        ),
    )

    it.effect('adding the same item twice increments its quantity', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(baseModel),
        Story.messageIn(
          ProductsPageBinding,
          ProductsBlock.Message.ClickedAddToCart({ item: apple }),
        ),
        Story.messageIn(
          ProductsPageBinding,
          ProductsBlock.Message.ClickedAddToCart({ item: apple }),
        ),
        Story.model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.quantity).toBe(2)
        }),
      ),
    )

    it.effect('ClickedIncrementQuantity raises the quantity for an item', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(baseModel, {
            cart: () => [{ item: apple, quantity: 1 }],
          }),
        ),
        Story.message(Message.ClickedIncrementQuantity({ itemId: '1' })),
        Story.model(model => {
          expect(model.cart[0]?.quantity).toBe(2)
        }),
      ),
    )

    it.effect('ClickedDecrementQuantity lowers the quantity for an item', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
          }),
        ),
        Story.message(Message.ClickedDecrementQuantity({ itemId: '1' })),
        Story.model(model => {
          expect(model.cart[0]?.quantity).toBe(1)
        }),
      ),
    )

    it.effect(
      'ClickedDecrementQuantity removes the item when it reaches zero',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(baseModel, {
              cart: () => [{ item: apple, quantity: 1 }],
            }),
          ),
          Story.message(Message.ClickedDecrementQuantity({ itemId: '1' })),
          Story.model(model => {
            expect(model.cart).toHaveLength(0)
          }),
        ),
    )

    it.effect('ClickedRemoveCartItem drops the matching cart entry', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(baseModel, {
            cart: () => [
              { item: apple, quantity: 2 },
              { item: banana, quantity: 1 },
            ],
          }),
        ),
        Story.message(Message.ClickedRemoveCartItem({ itemId: '1' })),
        Story.model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.item.id).toBe('2')
        }),
      ),
    )

    it.effect('ClickedClearCart empties the cart', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(baseModel, {
            cart: () => [{ item: apple, quantity: 2 }],
          }),
        ),
        Story.message(Message.ClickedClearCart()),
        Story.model(model => {
          expect(model.cart).toHaveLength(0)
        }),
      ),
    )
  })

  describe('checkout', () => {
    it.effect('UpdatedDeliveryInstructions stores the value', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(baseModel),
        Story.message(
          Message.UpdatedDeliveryInstructions({
            value: 'Leave at the door',
          }),
        ),
        Story.model(model => {
          expect(model.deliveryInstructions).toBe('Leave at the door')
        }),
      ),
    )

    it.effect(
      'ClickedPlaceOrder sets orderPlaced, clears the cart, and resets instructions',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(baseModel, {
              cart: () => [{ item: apple, quantity: 2 }],
              deliveryInstructions: () => 'Knock loudly',
            }),
          ),
          Story.message(Message.ClickedPlaceOrder()),
          Story.model(model => {
            expect(model.orderPlaced).toBe(true)
            expect(model.cart).toHaveLength(0)
            expect(model.deliveryInstructions).toBe('')
          }),
        ),
    )
  })
})
