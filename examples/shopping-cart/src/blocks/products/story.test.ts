import {
  Command,
  expectOutMessage,
  init,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { products } from '../../data/products'
import { Message, OutMessage } from './block'
import { ProductsBlock, layer } from './index'
import { ReplaceSearchUrl } from './products'

const apple = { id: '1', name: 'Apple', price: 1.5 }

describe('products', () => {
  it.effect(
    'ChangedSearchInput stores the query and replaces the search URL',
    () =>
      story(
        { block: ProductsBlock, layer },
        init(products),
        message(Message.ChangedSearchInput({ value: 'app' })),
        model(model => {
          expect(model.searchText).toBe('app')
        }),
        Command.expectHas(ReplaceSearchUrl),
        Command.resolve(ReplaceSearchUrl, Message.CompletedReplaceSearchUrl()),
      ),
  )

  it.effect('ClickedAddToCart emits AddedToCart', () =>
    story(
      { block: ProductsBlock, layer },
      init(products),
      message(Message.ClickedAddToCart({ item: apple })),
      expectOutMessage(OutMessage.AddedToCart({ item: apple })),
    ),
  )

  it.effect('ClickedIncrementQuantity emits IncrementedQuantity', () =>
    story(
      { block: ProductsBlock, layer },
      init(products),
      message(Message.ClickedIncrementQuantity({ itemId: '1' })),
      expectOutMessage(OutMessage.IncrementedQuantity({ itemId: '1' })),
    ),
  )

  it.effect('ClickedDecrementQuantity emits DecrementedQuantity', () =>
    story(
      { block: ProductsBlock, layer },
      init(products),
      message(Message.ClickedDecrementQuantity({ itemId: '1' })),
      expectOutMessage(OutMessage.DecrementedQuantity({ itemId: '1' })),
    ),
  )
})
