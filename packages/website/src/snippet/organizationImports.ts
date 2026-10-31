// application.ts
import { Schema } from 'effect'

import * as Cart from './domain/cart'
import { Search } from './search'

const Model = Schema.Struct({
  search: Search,
  cart: Cart.Cart,
})
type Model = typeof Model.Type

const cartCount = (model: Model): number => Cart.totalItems(model.cart)
