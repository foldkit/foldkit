import { Application } from '../definition'
import { Message } from '../message'
import { Home, Products } from '../page'

export const HomeBinding = Application.bindChild(Home.block, {
  field: 'home',
  parentMessage: Message.GotHomeMessage,
})

export const ProductsBinding = Application.bindChild(Products.block, {
  field: 'products',
  parentMessage: Message.GotProductsMessage,
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [HomeBinding, ProductsBinding],
})
