import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r } from 'foldkit/route'

// ROUTE

export const ProductsRoute = r('Products', { searchText: S.Option(S.String) })
export const CartRoute = r('Cart')
export const CheckoutRoute = r('Checkout')
export const NotFoundRoute = r('NotFound', { path: S.String })
export const AppRoute = S.Union([
  ProductsRoute,
  CartRoute,
  CheckoutRoute,
  NotFoundRoute,
])

export type ProductsRoute = typeof ProductsRoute.Type
export type CartRoute = typeof CartRoute.Type
export type CheckoutRoute = typeof CheckoutRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

// ROUTERS

export const productsRouter = pipe(
  Route.root,
  Route.query(S.Struct({ searchText: S.OptionFromOptional(S.String) })),
  Route.mapTo(ProductsRoute),
)
export const cartRouter = pipe(literal('cart'), Route.mapTo(CartRoute))
export const checkoutRouter = pipe(
  literal('checkout'),
  Route.mapTo(CheckoutRoute),
)

// PARSER

const routeParser = Route.oneOf(checkoutRouter, cartRouter, productsRouter)
export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
