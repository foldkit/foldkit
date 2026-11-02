import { Effect } from 'effect'
import {
  Command,
  expectOutMessage,
  init,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { products } from '../../data/products'
import { ProductsBlock, layer } from './block'
import { Message, OutMessage } from './definition'
import { ReplaceSearchUrl } from './products'

const apple = { id: '1', name: 'Apple', price: 1.5 }

describe('products', () => {
  test('ChangedSearchInput stores the query and replaces the search URL', async () => {
    await Effect.runPromise(
      story(
        ProductsBlock,
        init(products),
        message(Message.ChangedSearchInput({ value: 'app' })),
        model(model => {
          expect(model.searchText).toBe('app')
        }),
        Command.expectHas(ReplaceSearchUrl),
        Command.resolve(ReplaceSearchUrl, Message.CompletedReplaceSearchUrl()),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('ClickedAddToCart emits AddedToCart', async () => {
    await Effect.runPromise(
      story(
        ProductsBlock,
        init(products),
        message(Message.ClickedAddToCart({ item: apple })),
        expectOutMessage(OutMessage.AddedToCart({ item: apple })),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('ClickedIncrementQuantity emits IncrementedQuantity', async () => {
    await Effect.runPromise(
      story(
        ProductsBlock,
        init(products),
        message(Message.ClickedIncrementQuantity({ itemId: '1' })),
        expectOutMessage(OutMessage.IncrementedQuantity({ itemId: '1' })),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('ClickedDecrementQuantity emits DecrementedQuantity', async () => {
    await Effect.runPromise(
      story(
        ProductsBlock,
        init(products),
        message(Message.ClickedDecrementQuantity({ itemId: '1' })),
        expectOutMessage(OutMessage.DecrementedQuantity({ itemId: '1' })),
      ).pipe(Effect.provide(layer)),
    )
  })
})
