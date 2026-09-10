// page/home/index.ts
export { Model } from './model'
export { Message } from './message'
export * from './init'
export * from './update'
export * from './view'

// page/index.ts
export * as Home from './home'
export * as Products from './products'

// domain/index.ts
export * as Cart from './cart'
export * as Item from './item'
