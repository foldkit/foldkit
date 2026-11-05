import { ApplicationBlock, makeBinding, makeComposition } from '../block'
import { Home, Products } from '../blocks'

export const HomeBinding = makeBinding(Home.HomeBlock, {
  field: 'home',
})

export const ProductsBinding = makeBinding(Products.ProductsBlock, {
  field: 'products',
})

export const ApplicationComposition = makeComposition({
  bindings: [HomeBinding, ProductsBinding],
})
