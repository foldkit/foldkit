import { Home, Products } from '../blocks'
import { ApplicationDefinition } from '../definition'

export const HomeBinding = ApplicationDefinition.makeBinding(Home.HomeBlock, {
  field: 'home',
})

export const ProductsBinding = ApplicationDefinition.makeBinding(
  Products.ProductsBlock,
  {
    field: 'products',
  },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding, ProductsBinding],
})
