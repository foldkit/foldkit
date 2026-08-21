import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
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

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  GotProductsMessage: { message: Products.Message },
  ClickedIncrementQuantity: { itemId: S.String },
  ClickedDecrementQuantity: { itemId: S.String },
  ClickedRemoveCartItem: { itemId: S.String },
  ClickedClearCart: {},
  UpdatedDeliveryInstructions: { value: S.String },
  ClickedPlaceOrder: {},
})

export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => {
  return {
    model: {
      route: urlToAppRoute(url),
      cart: [],
      deliveryInstructions: '',
      orderPlaced: false,
      productsPage: Products.init(products),
    },
  }
}

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const foldProductsOutMessage = M.type<Products.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    AddedToCart:
      ({ item }) =>
      model => ({ model: evo(model, { cart: Cart.addItem(item) }) }),
    IncrementedQuantity:
      ({ itemId }) =>
      model => ({
        model: evo(model, { cart: Cart.incrementQuantity(itemId) }),
      }),
    DecrementedQuantity:
      ({ itemId }) =>
      model => ({
        model: evo(model, { cart: Cart.decrementQuantity(itemId) }),
      }),
  }),
)

const foldProducts = Update.foldChild({
  update: Products.update,
  read: (model: Model) => Option.some(model.productsPage),
  write: (model, nextProductsPage) =>
    evo(model, { productsPage: () => nextProductsPage }),
  toParentMessage: message => Message.GotProductsMessage({ message }),
  foldOutMessage: foldProductsOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      M.value(request).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          Internal: ({ url }) => ({
            model,
            commands: [NavigateInternal({ url: urlToString(url) })],
          }),

          External: ({ href }) => ({
            model,
            commands: [LoadExternal({ href })],
          }),
        }),
      ),

    ChangedUrl: ({ url }) => ({
      model: evo(model, {
        route: () => urlToAppRoute(url),
      }),
    }),

    GotProductsMessage: ({ message }) => foldProducts(model, message),

    ClickedIncrementQuantity: ({ itemId }) => ({
      model: evo(model, {
        cart: Cart.incrementQuantity(itemId),
      }),
    }),

    ClickedDecrementQuantity: ({ itemId }) => ({
      model: evo(model, {
        cart: Cart.decrementQuantity(itemId),
      }),
    }),

    ClickedRemoveCartItem: ({ itemId }) => ({
      model: evo(model, {
        cart: Cart.removeItem(itemId),
      }),
    }),

    ClickedClearCart: () => ({
      model: evo(model, {
        cart: () => [],
      }),
    }),

    UpdatedDeliveryInstructions: ({ value }) => ({
      model: evo(model, {
        deliveryInstructions: () => value,
      }),
    }),

    ClickedPlaceOrder: () => ({
      model: evo(model, {
        orderPlaced: () => true,
        cart: () => [],
        deliveryInstructions: () => '',
      }),
    }),
  })

// VIEW

const navigationView = (
  currentRoute: AppRoute,
  cartCount: number,
  h: HtmlBuilder<Message>,
): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return h.nav(
    [h.Class('bg-blue-500 text-white p-4 mb-6')],
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
    toParentMessage: message => Message.GotProductsMessage({ message }),
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
      [h.Class('min-h-screen bg-gray-100')],
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
