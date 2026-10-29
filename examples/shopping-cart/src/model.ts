import { Schema } from 'effect'

import { Cart } from './domain'
import * as Products from './page/products'
import { ApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  cart: Cart.Cart,
  deliveryInstructions: Schema.String,
  orderPlaced: Schema.Boolean,
  productsPage: Products.ProductsBlock.Model,
})
export type Model = typeof Model.Type
