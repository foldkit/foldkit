import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Item } from '../../domain'

export const Model = Schema.Struct({
  products: Schema.Array(Item.Item),
  searchText: Schema.String,
})

export const Message = defineMessageUnion({
  CompletedReplaceSearchUrl: {},
  ChangedSearchInput: { value: Schema.String },
  ClickedAddToCart: { item: Item.Item },
  ClickedIncrementQuantity: { itemId: Schema.String },
  ClickedDecrementQuantity: { itemId: Schema.String },
})

export const OutMessage = defineMessageUnion({
  AddedToCart: { item: Item.Item },
  IncrementedQuantity: { itemId: Schema.String },
  DecrementedQuantity: { itemId: Schema.String },
})

export const ProductsDefinition = Block.makeDefinition('Products', {
  Model,
  Message,
  OutMessage,
})

export const { makeOutMessageStep, makeNoopStep } = ProductsDefinition
