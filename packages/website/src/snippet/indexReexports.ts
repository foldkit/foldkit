// blocks/products/index.ts
export { ProductsBlock } from './definition'
export { layer } from './block'

// blocks/index.ts
export { HomeBlock } from './home'
export * as Home from './home'
export { ProductsBlock } from './products'
export * as Products from './products'

// domain/index.ts
export * as Cart from './cart'
export * as Item from './item'
