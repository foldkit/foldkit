import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

// ROUTE

export const AppRoute = defineRouteUnion({
  Products: { searchText: Schema.Option(Schema.String) },
  Cart: {},
  Checkout: {},
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

// ROUTERS

export const productsRouter = pipe(
  Route.root,
  Route.query(
    Schema.Struct({ searchText: Schema.OptionFromOptional(Schema.String) }),
  ),
  Route.mapTo(AppRoute.Products),
)
export const cartRouter = pipe(literal('cart'), Route.mapTo(AppRoute.Cart))
export const checkoutRouter = pipe(
  literal('checkout'),
  Route.mapTo(AppRoute.Checkout),
)

// PARSER

const routeParser = Route.oneOf(checkoutRouter, cartRouter, productsRouter)
export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
