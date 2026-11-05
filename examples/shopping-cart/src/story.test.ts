import { Option } from 'effect'
import { given, message, messageFrom, model, story } from 'foldkit/story'
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
    it.effect('root URL maps to Products with no search', () =>
      story(
        { block: ApplicationBlock, layer },
        given(baseModel),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Products')
        }),
      ),
    )

    it.effect('/cart maps to Cart', () =>
      story(
        { block: ApplicationBlock, layer },
        given(baseModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/cart') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Cart')
        }),
      ),
    )

    it.effect('/checkout maps to Checkout', () =>
      story(
        { block: ApplicationBlock, layer },
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

    it.effect('an unmatched path falls back to NotFound', () =>
      story(
        { block: ApplicationBlock, layer },
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

  describe('cart updates', () => {
    it.effect(
      'Products.AddedToCart OutMessage adds the item with quantity one',
      () =>
        story(
          { block: ApplicationBlock, layer },
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

    it.effect('adding the same item twice increments its quantity', () =>
      story(
        { block: ApplicationBlock, layer },
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

    it.effect('ClickedIncrementQuantity raises the quantity for an item', () =>
      story(
        { block: ApplicationBlock, layer },
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

    it.effect('ClickedDecrementQuantity lowers the quantity for an item', () =>
      story(
        { block: ApplicationBlock, layer },
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

    it.effect(
      'ClickedDecrementQuantity removes the item when it reaches zero',
      () =>
        story(
          { block: ApplicationBlock, layer },
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

    it.effect('ClickedRemoveCartItem drops the matching cart entry', () =>
      story(
        { block: ApplicationBlock, layer },
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

    it.effect('ClickedClearCart empties the cart', () =>
      story(
        { block: ApplicationBlock, layer },
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

  describe('checkout', () => {
    it.effect('UpdatedDeliveryInstructions stores the value', () =>
      story(
        { block: ApplicationBlock, layer },
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

    it.effect(
      'ClickedPlaceOrder sets orderPlaced, clears the cart, and resets instructions',
      () =>
        story(
          { block: ApplicationBlock, layer },
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
