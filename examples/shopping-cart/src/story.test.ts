import { Layer, Option } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message, type Model } from './application'
import { products } from './domain/products'
import { Products, ProductsLive } from './page/products'
import { ApplicationRoute } from './route'

type ProductsMessage = typeof Products.Message.Type

const apple = { id: '1', name: 'Apple', price: 1.5 }
const banana = { id: '2', name: 'Banana', price: 0.75 }

const application = ApplicationLive.pipe(Layer.provide(ProductsLive))

const baseModel: Resolved<Model> = {
  route: ApplicationRoute.Products({ searchText: Option.none() }),
  cart: [],
  deliveryInstructions: '',
  orderPlaced: false,
  productsPage: { products, searchText: '' },
}

const productsMessage = (message: ProductsMessage) =>
  Block.deliver(Products, 'productsPage', message)

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const startArgs = { url: urlOrThrow('http://localhost/') }

describe('update', () => {
  describe('routing', () => {
    it.effect('root URL maps to Products with no search', () =>
      story(
        application,
        startArgs,
        given(baseModel),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Products')
        }),
      ),
    )

    it.effect('/cart maps to Cart', () =>
      story(
        application,
        startArgs,
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
        application,
        startArgs,
        given(baseModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/checkout') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Checkout')
        }),
      ),
    )

    it.effect('an unmatched path falls back to NotFound', () =>
      story(
        application,
        startArgs,
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
          application,
          startArgs,
          given(baseModel),
          message(
            productsMessage(Products.Message.ClickedAddToCart({ item: apple })),
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
        application,
        startArgs,
        given(baseModel),
        message(
          productsMessage(Products.Message.ClickedAddToCart({ item: apple })),
        ),
        message(
          productsMessage(Products.Message.ClickedAddToCart({ item: apple })),
        ),
        model(model => {
          expect(model.cart).toHaveLength(1)
          expect(model.cart[0]?.quantity).toBe(2)
        }),
      ),
    )

    it.effect('ClickedIncrementQuantity raises the quantity for an item', () =>
      story(
        application,
        startArgs,
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
        application,
        startArgs,
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
          application,
          startArgs,
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
        application,
        startArgs,
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
        application,
        startArgs,
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
        application,
        startArgs,
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
          application,
          startArgs,
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
