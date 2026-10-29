import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

// ROUTE

export const ApplicationRoute = defineRouteUnion({
  Products: { searchText: Schema.Option(Schema.String) },
  Cart: {},
  Checkout: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

// ROUTERS

export const productsRouter = pipe(
  Route.root,
  Route.query(
    Schema.Struct({ searchText: Schema.OptionFromOptional(Schema.String) }),
  ),
  Route.mapTo(ApplicationRoute.Products),
)
export const cartRouter = pipe(
  literal('cart'),
  Route.mapTo(ApplicationRoute.Cart),
)
export const checkoutRouter = pipe(
  literal('checkout'),
  Route.mapTo(ApplicationRoute.Checkout),
)

// PARSER

const routeParser = Route.oneOf(checkoutRouter, cartRouter, productsRouter)
export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
