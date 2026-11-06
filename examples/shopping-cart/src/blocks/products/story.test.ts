import { Story } from 'foldkit'
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
      Story.story(
        { block: ProductsBlock, layer },
        Story.init(products),
        Story.message(Message.ChangedSearchInput({ value: 'app' })),
        Story.model(model => {
          expect(model.searchText).toBe('app')
        }),
        Story.Command.expectHas(ReplaceSearchUrl),
        Story.Command.resolve(
          ReplaceSearchUrl,
          Message.CompletedReplaceSearchUrl(),
        ),
      ),
  )

  it.effect('ClickedAddToCart emits AddedToCart', () =>
    Story.story(
      { block: ProductsBlock, layer },
      Story.init(products),
      Story.message(Message.ClickedAddToCart({ item: apple })),
      Story.expectOutMessage(OutMessage.AddedToCart({ item: apple })),
    ),
  )

  it.effect('ClickedIncrementQuantity emits IncrementedQuantity', () =>
    Story.story(
      { block: ProductsBlock, layer },
      Story.init(products),
      Story.message(Message.ClickedIncrementQuantity({ itemId: '1' })),
      Story.expectOutMessage(OutMessage.IncrementedQuantity({ itemId: '1' })),
    ),
  )

  it.effect('ClickedDecrementQuantity emits DecrementedQuantity', () =>
    Story.story(
      { block: ProductsBlock, layer },
      Story.init(products),
      Story.message(Message.ClickedDecrementQuantity({ itemId: '1' })),
      Story.expectOutMessage(OutMessage.DecrementedQuantity({ itemId: '1' })),
    ),
  )
})
