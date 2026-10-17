import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Item } from '../../domain'

export const Model = Schema.Struct({
  products: Schema.Array(Item.Item),
  searchText: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  CompletedReplaceSearchUrl: {},
  ChangedSearchInput: { value: Schema.String },
  ClickedAddToCart: { item: Item.Item },
  ClickedIncrementQuantity: { itemId: Schema.String },
  ClickedDecrementQuantity: { itemId: Schema.String },
})

export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  AddedToCart: { item: Item.Item },
  IncrementedQuantity: { itemId: Schema.String },
  DecrementedQuantity: { itemId: Schema.String },
})

export type OutMessage = typeof OutMessage.Type

export type AddedToCart = typeof OutMessage.AddedToCart.Type
export type IncrementedQuantity = typeof OutMessage.IncrementedQuantity.Type
export type DecrementedQuantity = typeof OutMessage.DecrementedQuantity.Type

export const Products = Block.define('Products', {
  Model,
  Message,
  OutMessage,
})

export const ProductsComposition = Products.makeComposition()
