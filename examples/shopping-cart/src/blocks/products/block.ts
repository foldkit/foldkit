import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Cart, Item } from '../../domain'

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

export const ProductsKey = Symbol('Products')
export const ProductsBlock = Block.make('Products', {
  key: ProductsKey,
  InitArgs: Schema.Tuple([Schema.Array(Item.Item)]),
  view: { kind: 'Element', Inputs: Schema.Struct({ cart: Cart.Cart }) },
  Model,
  Message,
  OutMessage,
})

export const {
  makeCommand,
  makeComposition,
  makeNoopStep,
  makeOutMessageStep,
} = ProductsBlock
