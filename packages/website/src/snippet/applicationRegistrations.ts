import { Home, Products } from '../blocks'
import { ApplicationBlock } from '../definition'

export const HomeBinding = ApplicationBlock.makeBinding(Home.HomeBlock, {
  field: 'home',
})

export const ProductsBinding = ApplicationBlock.makeBinding(
  Products.ProductsBlock,
  {
    field: 'products',
  },
)

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [HomeBinding, ProductsBinding],
})
