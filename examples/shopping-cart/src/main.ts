import { Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Route, Runtime } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { load, pushUrl } from 'foldkit/navigation'
import { literal, r } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { products } from './data/products'
import { Cart, Item } from './domain'
import {
  Class,
  Href,
  a,
  div,
  h1,
  header,
  keyed,
  li,
  main,
  nav,
  p,
  ul,
} from './html'
import { Cart as CartPage, Checkout, Products } from './page'

// ROUTE

export const ProductsRoute = r('Products', { searchText: S.Option(S.String) })
export const CartRoute = r('Cart')
export const CheckoutRoute = r('Checkout')
export const NotFoundRoute = r('NotFound', { path: S.String })
export const AppRoute = S.Union(
  ProductsRoute,
  CartRoute,
  CheckoutRoute,
  NotFoundRoute,
)

export type ProductsRoute = typeof ProductsRoute.Type
export type CartRoute = typeof CartRoute.Type
export type CheckoutRoute = typeof CheckoutRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

const productsRouter = pipe(
  Route.root,
  Route.query(S.Struct({ searchText: S.OptionFromUndefinedOr(S.String) })),
  Route.mapTo(ProductsRoute),
)
const cartRouter = pipe(literal('cart'), Route.mapTo(CartRoute))
const checkoutRouter = pipe(literal('checkout'), Route.mapTo(CheckoutRoute))

const routeParser = Route.oneOf(checkoutRouter, cartRouter, productsRouter)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({
  route: AppRoute,
  cart: Cart.Cart,
  deliveryInstructions: S.String,
  orderPlaced: S.Boolean,
  productsPage: Products.Model,
})
type Model = typeof Model.Type

// MESSAGE

const NoOp = m('NoOp')
const ClickedLink = m('ClickedLink', {
  request: Runtime.UrlRequest,
})
const ChangedUrl = m('ChangedUrl', { url: Url })
const GotProductsMessage = m('GotProductsMessage', {
  message: Products.Message,
})
const ClickedAddToCart = m('ClickedAddToCart', { item: Item.Item })
const ClickedQuantityChange = m('ClickedQuantityChange', {
  itemId: S.String,
  quantity: S.Number,
})
export const ClickedCartQuantityChange = m('ClickedCartQuantityChange', {
  itemId: S.String,
  quantity: S.Number,
})
export const ClickedRemoveCartItem = m('ClickedRemoveCartItem', {
  itemId: S.String,
})
export const ClickedClearCart = m('ClickedClearCart')
export const UpdatedDeliveryInstructions = m('UpdatedDeliveryInstructions', {
  value: S.String,
})
export const ClickedPlaceOrder = m('ClickedPlaceOrder')

export const Message = S.Union(
  NoOp,
  ClickedLink,
  ChangedUrl,
  GotProductsMessage,
  ClickedAddToCart,
  ClickedQuantityChange,
  ClickedCartQuantityChange,
  ClickedRemoveCartItem,
  ClickedClearCart,
  UpdatedDeliveryInstructions,
  ClickedPlaceOrder,
)
export type Message = typeof Message.Type

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [
    {
      route: urlToAppRoute(url),
      cart: [],
      deliveryInstructions: '',
      orderPlaced: false,
      productsPage: Products.init(products),
    },
    [],
  ]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.withReturnType<[Model, ReadonlyArray<Command<typeof NoOp>>]>(),
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp()))],
            ],

            External: ({ href }) => [
              model,
              [load(href).pipe(Effect.as(NoOp()))],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      GotProductsMessage: ({ message }) => {
        const [newProductsModel, commands] = Products.update(productsRouter)(
          model.productsPage,
          message,
        )

        return [
          evo(model, {
            productsPage: () => newProductsModel,
          }),
          commands.map(Effect.map(message => GotProductsMessage({ message }))),
        ]
      },

      ClickedAddToCart: ({ item }) => [
        evo(model, {
          cart: () => Cart.addItem(item)(model.cart),
        }),
        [],
      ],

      ClickedQuantityChange: ({ itemId, quantity }) => [
        evo(model, {
          cart: () => Cart.changeQuantity(itemId, quantity)(model.cart),
        }),
        [],
      ],

      ClickedCartQuantityChange: ({ itemId, quantity }) => [
        evo(model, {
          cart: () => Cart.changeQuantity(itemId, quantity)(model.cart),
        }),
        [],
      ],

      ClickedRemoveCartItem: ({ itemId }) => [
        evo(model, {
          cart: () => Cart.removeItem(itemId)(model.cart),
        }),
        [],
      ],

      ClickedClearCart: () => [
        evo(model, {
          cart: () => [],
        }),
        [],
      ],

      UpdatedDeliveryInstructions: ({ value }) => [
        evo(model, {
          deliveryInstructions: () => value,
        }),
        [],
      ],

      ClickedPlaceOrder: () => [
        evo(model, {
          orderPlaced: () => true,
          cart: () => [],
          deliveryInstructions: () => '',
        }),
        [],
      ],
    }),
  )

// VIEW

const navigationView = (currentRoute: AppRoute, cartCount: number): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return nav(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      ul(
        [Class('max-w-6xl mx-auto flex gap-6 justify-center list-none')],
        [
          li(
            [],
            [
              a(
                [
                  Href(productsRouter({ searchText: Option.none() })),
                  Class(navLinkClassName(currentRoute._tag === 'Products')),
                ],
                ['Products'],
              ),
            ],
          ),
          li(
            [],
            [
              a(
                [
                  Href(cartRouter()),
                  Class(navLinkClassName(currentRoute._tag === 'Cart')),
                ],
                cartCount > 0 ? [`Cart (${cartCount})`] : ['Cart'],
              ),
            ],
          ),
          li(
            [],
            [
              a(
                [
                  Href(checkoutRouter()),
                  Class(navLinkClassName(currentRoute._tag === 'Checkout')),
                ],
                ['Checkout'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const productsView = (model: Model): Html => {
  return Products.view(
    model.productsPage,
    model.cart,
    cartRouter,
    message => GotProductsMessage({ message }),
    item => ClickedAddToCart({ item }),
    (itemId, quantity) => ClickedQuantityChange({ itemId, quantity }),
  )
}

const cartView = (model: Model): Html => {
  return CartPage.view(model.cart, productsRouter, checkoutRouter)
}

const checkoutView = (model: Model): Html => {
  return Checkout.view(
    model.cart,
    model.deliveryInstructions,
    model.orderPlaced,
    productsRouter,
    cartRouter,
  )
}

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h1(
        [Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      a(
        [
          Href(productsRouter({ searchText: Option.none() })),
          Class('text-blue-500 hover:underline'),
        ],
        ['← Go to Products'],
      ),
    ],
  )

const view = (model: Model): Html => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Products: () => productsView(model),
      Cart: () => cartView(model),
      Checkout: () => checkoutView(model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return div(
    [Class('min-h-screen bg-gray-100')],
    [
      header([], [navigationView(model.route, Cart.totalItems(model.cart))]),
      main(
        [Class('py-8')],
        [keyed('div')(model.route._tag, [], [routeContent])],
      ),
    ],
  )
}

// RUN

const app = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(app)
