import { Command, expectOutMessage, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { products } from '../domain/products'
import { Products, ProductsLive, ReplaceSearchUrl } from './products'

const apple = { id: '1', name: 'Apple', price: 1.5 }

const startArgs = { products }

describe('products', () => {
  it.effect(
    'ChangedSearchInput stores the query and replaces the search URL',
    () =>
      story(
        ProductsLive,
        startArgs,
        message(Products.Message.ChangedSearchInput({ value: 'app' })),
        model(model => {
          expect(model.searchText).toBe('app')
        }),
        Command.expectHas(ReplaceSearchUrl),
        Command.resolve(
          ReplaceSearchUrl,
          Products.Message.CompletedReplaceSearchUrl(),
        ),
      ),
  )

  it.effect('ClickedAddToCart emits AddedToCart', () =>
    story(
      ProductsLive,
      startArgs,
      message(Products.Message.ClickedAddToCart({ item: apple })),
      expectOutMessage(Products.OutMessage.AddedToCart({ item: apple })),
    ),
  )

  it.effect('ClickedIncrementQuantity emits IncrementedQuantity', () =>
    story(
      ProductsLive,
      startArgs,
      message(Products.Message.ClickedIncrementQuantity({ itemId: '1' })),
      expectOutMessage(
        Products.OutMessage.IncrementedQuantity({ itemId: '1' }),
      ),
    ),
  )

  it.effect('ClickedDecrementQuantity emits DecrementedQuantity', () =>
    story(
      ProductsLive,
      startArgs,
      message(Products.Message.ClickedDecrementQuantity({ itemId: '1' })),
      expectOutMessage(
        Products.OutMessage.DecrementedQuantity({ itemId: '1' }),
      ),
    ),
  )
})
