import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
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
export const ClickedQuantityChange = m('ClickedQuantityChange', {
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

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  GotProductsMessage,
  ClickedQuantityChange,
  ClickedRemoveCartItem,
  ClickedClearCart,
  UpdatedDeliveryInstructions,
  ClickedPlaceOrder,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingProgramInit<Model, Message> = (url: Url) => {
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

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

      GotProductsMessage: ({ message }) => {
        const [nextProductsModel, commands, maybeOutMessage] = Products.update(
          model.productsPage,
          message,
        )
        const mappedCommands = Command.mapMessages(commands, message =>
          GotProductsMessage({ message }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { productsPage: () => nextProductsModel }),
            mappedCommands,
          ],
          onSome: M.type<Products.OutMessage>().pipe(
            withUpdateReturn,
            M.tagsExhaustive({
              AddedToCart: ({ item }) => [
                evo(model, {
                  productsPage: () => nextProductsModel,
                  cart: Cart.addItem(item),
                }),
                mappedCommands,
              ],
              ChangedQuantity: ({ itemId, quantity }) => [
                evo(model, {
                  productsPage: () => nextProductsModel,
                  cart: Cart.changeQuantity(itemId, quantity),
                }),
                mappedCommands,
              ],
            }),
          ),
        })
      },

      ClickedQuantityChange: ({ itemId, quantity }) => [
        evo(model, {
          cart: Cart.changeQuantity(itemId, quantity),
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

const navigationView = (currentRoute: AppRoute, cartCount: number): Html => {
  const h = html<Message>()

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

const productsView = (model: Model): Html => {
  const h = html<Message>()
  return h.submodel({
    slotId: 'products',
    model: model.productsPage,
    view: Products.view,
    viewInputs: { cart: model.cart },
    toParentMessage: message => GotProductsMessage({ message }),
  })
}

const cartView = (model: Model): Html => {
  return CartPage.view(model.cart)
}

const checkoutView = (model: Model): Html => {
  return Checkout.view(
    model.cart,
    model.deliveryInstructions,
    model.orderPlaced,
  )
}

const notFoundView = (path: string): Html => {
  const h = html<Message>()

  return h.div(
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
}

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tag('Products', () => 'Shopping Cart'),
    M.orElse(({ _tag }) => `${_tag} — Shopping Cart`),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Products: () => productsView(model),
      Cart: () => cartView(model),
      Checkout: () => checkoutView(model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.header(
          [],
          [navigationView(model.route, Cart.totalItems(model.cart))],
        ),
        h.main(
          [h.Class('py-8')],
          [h.keyed('div')(model.route._tag, [], [routeContent])],
        ),
      ],
    ),
  }
}
