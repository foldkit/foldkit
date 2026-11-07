import type { Block } from 'foldkit'

import {
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import { ProductsBlock } from './blocks'
import { products } from './data/products'
import { Cart } from './domain'

export const ProductsPageBinding = makeRequiredFieldBinding(ProductsBlock, {
  field: 'productsPage',
  init: { contextToArgs: () => [products] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ProductsBlock, {
    AddedToCart: ({ item }) =>
      makeFieldsStep(() => ({
        cart: Cart.addItem(item),
      })),
    IncrementedQuantity: ({ itemId }) =>
      makeFieldsStep(() => ({
        cart: Cart.incrementQuantity(itemId),
      })),
    DecrementedQuantity: ({ itemId }) =>
      makeFieldsStep(() => ({
        cart: Cart.decrementQuantity(itemId),
      })),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [ProductsPageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
