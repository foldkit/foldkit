import type { Block } from 'foldkit'

import { ProductsBlock } from './blocks'
import { products } from './data/products'
import { ApplicationBlock, makeFieldsStep } from './definition'
import { Cart } from './domain'

export const ProductsPageBinding = ApplicationBlock.makeBinding(ProductsBlock, {
  field: 'productsPage',
  init: { contextToArgs: () => [products] },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(ProductsBlock, {
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

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [ProductsPageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
