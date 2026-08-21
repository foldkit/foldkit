import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { products } from './data/products'
import { Cart } from './domain'
import { Cart as CartPage, Checkout, Products } from './page'
import {
  AppRoute,
  cartRouter,
  checkoutRouter,
  productsRouter,
  urlToAppRoute,
} from './route'

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  cart: Cart.Cart,
  deliveryInstructions: S.String,
  orderPlaced: S.Boolean,
  productsPage: Products.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const GotProductsMessage = m('GotProductsMessage', {
  message: Products.Message,
})
export const ClickedIncrementQuantity = m('ClickedIncrementQuantity', {
  itemId: S.String,
})
export const ClickedDecrementQuantity = m('ClickedDecrementQuantity', {
  itemId: S.String,
})
export const ClickedRemoveCartItem = m('ClickedRemoveCartItem', {
  itemId: S.String,
})
export const ClickedClearCart = m('ClickedClearCart')
export const UpdatedDeliveryInstructions = m('UpdatedDeliveryInstructions', {
  value: S.String,
})
export const ClickedPlaceOrder = m('ClickedPlaceOrder')

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  GotProductsMessage,
  ClickedIncrementQuantity,
  ClickedDecrementQuantity,
  ClickedRemoveCartItem,
  ClickedClearCart,
  UpdatedDeliveryInstructions,
  ClickedPlaceOrder,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => {
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

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [CompletedLoadExternal],
  execute: ({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const foldProductsOutMessage = M.type<Products.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    AddedToCart:
      ({ item }) =>
      model => [evo(model, { cart: Cart.addItem(item) }), []],
    IncrementedQuantity:
      ({ itemId }) =>
      model => [evo(model, { cart: Cart.incrementQuantity(itemId) }), []],
    DecrementedQuantity:
      ({ itemId }) =>
      model => [evo(model, { cart: Cart.decrementQuantity(itemId) }), []],
  }),
)

const foldProducts = Update.foldChild({
  update: Products.update,
  read: (model: Model) => Option.some(model.productsPage),
  write: (model, nextProductsPage) =>
    evo(model, { productsPage: () => nextProductsPage }),
  toParentMessage: message => GotProductsMessage({ message }),
  foldOutMessage: foldProductsOutMessage,
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [NavigateInternal({ url: urlToString(url) })],
            ],

            External: ({ href }) => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      GotProductsMessage: ({ message }) => foldProducts(model, message),

      ClickedIncrementQuantity: ({ itemId }) => [
        evo(model, {
          cart: Cart.incrementQuantity(itemId),
        }),
        [],
      ],

      ClickedDecrementQuantity: ({ itemId }) => [
        evo(model, {
          cart: Cart.decrementQuantity(itemId),
        }),
        [],
      ],

      ClickedRemoveCartItem: ({ itemId }) => [
        evo(model, {
          cart: Cart.removeItem(itemId),
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

const navigationView = (
  currentRoute: AppRoute,
  cartCount: number,
  h: HtmlBuilder<Message>,
): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-orange-600 font-medium px-3 py-1.5 rounded-lg ${isActive ? 'bg-orange-800/60' : ''}`

  return h.nav(
    [
      h.Class(
        'bg-orange-700/95 text-white px-4 py-3 mb-8 shadow-sm backdrop-blur',
      ),
    ],
    [
      h.ul(
        [h.Class('max-w-6xl mx-auto flex gap-6 justify-center list-none')],
        [
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(productsRouter({ searchText: Option.none() })),
                  h.Class(navLinkClassName(currentRoute._tag === 'Products')),
                ],
                ['Products'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(cartRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Cart')),
                ],
                cartCount > 0 ? [`Cart (${cartCount})`] : ['Cart'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(checkoutRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Checkout')),
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

const productsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: 'products',
    model: model.productsPage,
    view: Products.view,
    viewInputs: { cart: model.cart },
    toParentMessage: message => GotProductsMessage({ message }),
  })

const cartView = (model: Model, h: HtmlBuilder<Message>): Html =>
  CartPage.view(model.cart, h)

const checkoutView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Checkout.view(model.cart, model.deliveryInstructions, model.orderPlaced, h)

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [
          h.Href(productsRouter({ searchText: Option.none() })),
          h.Class('text-blue-500 hover:underline'),
        ],
        ['← Go to Products'],
      ),
    ],
  )

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tag('Products', () => 'Shopping Cart'),
    M.orElse(({ _tag }) => `${_tag} | Shopping Cart`),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Products: () => productsView(model, h),
      Cart: () => cartView(model, h),
      Checkout: () => checkoutView(model, h),
      NotFound: ({ path }) => notFoundView(path, h),
    }),
  )

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-50')],
      [
        h.header(
          [],
          [navigationView(model.route, Cart.totalItems(model.cart), h)],
        ),
        h.main([h.Class('py-8')], [routeContent]),
      ],
    ),
  }
}
