import {
  ApplicationBlock,
  makeRequiredFieldBinding,
  makeComposition,
} from '../block'
import { Home, Products } from '../blocks'

export const HomeBinding = makeRequiredFieldBinding(Home.HomeBlock, {
  field: 'home',
})

export const ProductsBinding = makeRequiredFieldBinding(
  Products.ProductsBlock,
  {
    field: 'products',
  },
)

export const ApplicationComposition = makeComposition({
  bindings: [HomeBinding, ProductsBinding],
})
