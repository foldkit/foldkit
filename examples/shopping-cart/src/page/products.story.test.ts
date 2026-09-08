import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { products } from '../data/products'
import { Message, OutMessage, ReplaceSearchUrl, init, update } from './products'

const apple = { id: '1', name: 'Apple', price: 1.5 }

describe('products', () => {
  test('ChangedSearchInput stores the query and replaces the search URL', () => {
    story(
      update,
      given(init(products)),
      message(Message.ChangedSearchInput({ value: 'app' })),
      model(model => {
        expect(model.searchText).toBe('app')
      }),
      Command.expectHas(ReplaceSearchUrl),
      Command.resolve(ReplaceSearchUrl, Message.CompletedReplaceSearchUrl()),
    )
  })

  test('ClickedAddToCart emits AddedToCart', () => {
    story(
      update,
      given(init(products)),
      message(Message.ClickedAddToCart({ item: apple })),
      expectOutMessage(OutMessage.AddedToCart({ item: apple })),
    )
  })

  test('ClickedIncrementQuantity emits IncrementedQuantity', () => {
    story(
      update,
      given(init(products)),
      message(Message.ClickedIncrementQuantity({ itemId: '1' })),
      expectOutMessage(OutMessage.IncrementedQuantity({ itemId: '1' })),
    )
  })

  test('ClickedDecrementQuantity emits DecrementedQuantity', () => {
    story(
      update,
      given(init(products)),
      message(Message.ClickedDecrementQuantity({ itemId: '1' })),
      expectOutMessage(OutMessage.DecrementedQuantity({ itemId: '1' })),
    )
  })
})
