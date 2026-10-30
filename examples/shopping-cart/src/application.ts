import { Array, Effect, Match, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Button, Textarea } from '@foldkit/ui'

import * as Cart from './domain/cart'
import { products } from './domain/products'
import { Products } from './page/products'
import {
  ApplicationRoute,
  cartRouter,
  checkoutRouter,
  productsRouter,
  urlToApplicationRoute,
} from './route'

// MODEL

export const Model = Schema.Struct({
  route: ApplicationRoute,
  cart: Cart.Cart,
  deliveryInstructions: Schema.String,
  orderPlaced: Schema.Boolean,
  productsPage: Products,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  ClickedIncrementQuantity: { itemId: Schema.String },
  ClickedDecrementQuantity: { itemId: Schema.String },
  ClickedRemoveCartItem: { itemId: Schema.String },
  ClickedClearCart: {},
  UpdatedDeliveryInstructions: { value: Schema.String },
  ClickedPlaceOrder: {},
})
export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model,
    Message,
    Command: [NavigateInternal, LoadExternal],
  },
) {}

// LIVE

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const productsPage = yield* new Products('productsPage', { products })

    return {
      model: {
        route: urlToApplicationRoute(url),
        cart: [],
        deliveryInstructions: '',
        orderPlaced: false,
        productsPage,
      },

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url: internalUrl }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(internalUrl) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url: nextUrl }) => ({
          model: modifyFields(model, {
            route: () => urlToApplicationRoute(nextUrl),
          }),
        }),

        ClickedIncrementQuantity: (model, { itemId }) => ({
          model: modifyFields(model, {
            cart: Cart.incrementQuantity(itemId),
          }),
        }),

        ClickedDecrementQuantity: (model, { itemId }) => ({
          model: modifyFields(model, {
            cart: Cart.decrementQuantity(itemId),
          }),
        }),

        ClickedRemoveCartItem: (model, { itemId }) => ({
          model: modifyFields(model, { cart: Cart.removeItem(itemId) }),
        }),

        ClickedClearCart: model => ({
          model: modifyFields(model, { cart: () => [] }),
        }),

        UpdatedDeliveryInstructions: (model, { value }) => ({
          model: modifyFields(model, { deliveryInstructions: () => value }),
        }),

        ClickedPlaceOrder: model => ({
          model: modifyFields(model, {
            orderPlaced: () => true,
            cart: () => [],
            deliveryInstructions: () => '',
          }),
        }),

        ...productsPage.on({
          AddedToCart: (model, { item }) => ({
            model: modifyFields(model, { cart: Cart.addItem(item) }),
          }),
          IncrementedQuantity: (model, { itemId }) => ({
            model: modifyFields(model, {
              cart: Cart.incrementQuantity(itemId),
            }),
          }),
          DecrementedQuantity: (model, { itemId }) => ({
            model: modifyFields(model, {
              cart: Cart.decrementQuantity(itemId),
            }),
          }),
        }),
      },

      commands: {
        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view,
    }
  }),
)

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

const navigationView = (
  currentRoute: ApplicationRoute,
  cartCount: number,
  h: ApplicationViewBuilder,
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

const productsView = (model: Model): Html =>
  model.productsPage.view({ cart: model.cart })

const cartPageView = (cart: Cart.Cart, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-8')],
        ['Shopping Cart'],
      ),
      h.div(
        [h.Class('bg-white rounded-lg shadow p-6')],
        [
          h.div(
            [],
            Array.match(cart, {
              onEmpty: () => [
                h.p(
                  [h.Class('text-gray-500 text-center py-8')],
                  ['Your cart is empty'],
                ),
                h.div(
                  [h.Class('text-center mt-4')],
                  [
                    h.a(
                      [
                        h.Href(productsRouter({ searchText: Option.none() })),
                        h.Class(
                          'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
                        ),
                      ],
                      ['Continue Shopping'],
                    ),
                  ],
                ),
              ],
              onNonEmpty: cart => [
                h.section(
                  [h.Class('space-y-4 mb-6')],
                  cart.map(cartItem =>
                    h.keyed('article')(
                      cartItem.item.id,
                      [
                        h.Class(
                          'flex items-center justify-between p-4 border rounded-lg',
                        ),
                      ],
                      [
                        h.div(
                          [],
                          [
                            h.h3(
                              [h.Class('font-semibold text-gray-800')],
                              [cartItem.item.name],
                            ),
                            h.p(
                              [h.Class('text-gray-600')],
                              [`$${cartItem.item.price.toFixed(2)} each`],
                            ),
                          ],
                        ),
                        h.div(
                          [h.Class('flex items-center gap-2')],
                          [
                            Button.view(
                              {
                                onClick: Message.ClickedDecrementQuantity({
                                  itemId: cartItem.item.id,
                                }),
                                toView: attributes =>
                                  h.button(
                                    [
                                      ...attributes.button,
                                      h.Class(
                                        'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                      ),
                                    ],
                                    ['-'],
                                  ),
                              },
                              h,
                            ),
                            h.span(
                              [h.Class('px-3 py-1 font-medium')],
                              [String(cartItem.quantity)],
                            ),
                            Button.view(
                              {
                                onClick: Message.ClickedIncrementQuantity({
                                  itemId: cartItem.item.id,
                                }),
                                toView: attributes =>
                                  h.button(
                                    [
                                      ...attributes.button,
                                      h.Class(
                                        'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                      ),
                                    ],
                                    ['+'],
                                  ),
                              },
                              h,
                            ),
                            Button.view(
                              {
                                onClick: Message.ClickedRemoveCartItem({
                                  itemId: cartItem.item.id,
                                }),
                                toView: attributes =>
                                  h.button(
                                    [
                                      ...attributes.button,
                                      h.Class(
                                        'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2',
                                      ),
                                    ],
                                    ['Remove'],
                                  ),
                              },
                              h,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                h.div(
                  [h.Class('border-t pt-4 mb-6')],
                  [
                    h.div(
                      [h.Class('flex justify-between items-center')],
                      [
                        h.h3(
                          [h.Class('text-xl font-bold text-gray-800')],
                          ['Total'],
                        ),
                        h.p(
                          [h.Class('text-xl font-bold text-gray-800')],
                          [
                            `$${cart.reduce((total, item) => total + item.item.price * item.quantity, 0).toFixed(2)}`,
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                h.div(
                  [h.Class('flex gap-4 justify-center')],
                  [
                    h.a(
                      [
                        h.Href(productsRouter({ searchText: Option.none() })),
                        h.Class(
                          'bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                      ],
                      ['Continue Shopping'],
                    ),
                    Button.view(
                      {
                        onClick: Message.ClickedClearCart(),
                        toView: attributes =>
                          h.button(
                            [
                              ...attributes.button,
                              h.Class(
                                'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium',
                              ),
                            ],
                            ['Clear Cart'],
                          ),
                      },
                      h,
                    ),
                    h.a(
                      [
                        h.Href(checkoutRouter()),
                        h.Class(
                          'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                      ],
                      ['Proceed to Checkout'],
                    ),
                  ],
                ),
              ],
            }),
          ),
        ],
      ),
    ],
  )

const checkoutPageView = (
  cart: Cart.Cart,
  deliveryInstructions: string,
  orderPlaced: boolean,
  h: ApplicationViewBuilder,
): Html => {
  if (orderPlaced) {
    return h.div(
      [h.Class('max-w-4xl mx-auto px-4 text-center')],
      [
        h.h1(
          [h.Class('text-4xl font-bold text-green-600 mb-8')],
          ['Order placed successfully!'],
        ),
        h.article(
          [h.Class('bg-green-50 border border-green-200 rounded-lg p-6 mb-6')],
          [
            h.p(
              [h.Class('text-lg text-gray-700 mb-4')],
              ["Thank you for your order! We'll deliver it soon."],
            ),
            h.p(
              [h.Class('text-gray-600')],
              ['You will receive a confirmation email shortly.'],
            ),
          ],
        ),
        h.a(
          [
            h.Href(productsRouter({ searchText: Option.none() })),
            h.Class(
              'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
            ),
          ],
          ['Continue Shopping'],
        ),
      ],
    )
  }

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-8')], ['Checkout']),
      h.div(
        [h.Class('bg-white rounded-lg shadow p-6')],
        Array.match(cart, {
          onEmpty: () => [
            h.p(
              [h.Class('text-gray-500 text-center py-8')],
              ['Your cart is empty'],
            ),
            h.div(
              [h.Class('text-center mt-4')],
              [
                h.a(
                  [
                    h.Href(productsRouter({ searchText: Option.none() })),
                    h.Class(
                      'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
                    ),
                  ],
                  ['Start Shopping'],
                ),
              ],
            ),
          ],
          onNonEmpty: cart => [
            h.section(
              [],
              [
                h.h2(
                  [h.Class('text-2xl font-bold text-gray-800 mb-4')],
                  ['Order Summary'],
                ),
                h.div(
                  [h.Class('space-y-2 mb-6')],
                  cart.map(cartItem =>
                    h.keyed('div')(
                      cartItem.item.id,
                      [
                        h.Class(
                          'flex justify-between items-center py-2 border-b',
                        ),
                      ],
                      [
                        h.div(
                          [],
                          [
                            h.span(
                              [h.Class('font-medium')],
                              [cartItem.item.name],
                            ),
                            h.span(
                              [h.Class('text-gray-600 ml-2')],
                              [`× ${cartItem.quantity}`],
                            ),
                          ],
                        ),
                        h.span(
                          [h.Class('font-medium')],
                          [
                            `$${(cartItem.item.price * cartItem.quantity).toFixed(2)}`,
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            h.div(
              [
                h.Class(
                  'flex justify-between items-center text-xl font-bold mb-6',
                ),
              ],
              [
                h.span([], ['Total']),
                h.span(
                  [],
                  [
                    `$${cart.reduce((total, item) => total + item.item.price * item.quantity, 0).toFixed(2)}`,
                  ],
                ),
              ],
            ),
            Textarea.view(
              {
                id: 'delivery-instructions',
                value: deliveryInstructions,
                placeholder: 'Special delivery instructions (optional)...',
                onInput: value =>
                  Message.UpdatedDeliveryInstructions({ value }),
                toView: attributes =>
                  h.div(
                    [h.Class('mb-6')],
                    [
                      h.label(
                        [
                          ...attributes.label,
                          h.Class(
                            'block text-lg font-semibold text-gray-800 mb-2',
                          ),
                        ],
                        ['Delivery Instructions'],
                      ),
                      h.textarea([
                        ...attributes.textarea,
                        h.Class(
                          'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none',
                        ),
                      ]),
                    ],
                  ),
              },
              h,
            ),
            h.div(
              [h.Class('flex gap-4 justify-center')],
              [
                h.a(
                  [
                    h.Href(cartRouter()),
                    h.Class(
                      'bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium',
                    ),
                  ],
                  ['Back to Cart'],
                ),
                Button.view(
                  {
                    onClick: Message.ClickedPlaceOrder(),
                    toView: attributes =>
                      h.button(
                        [
                          ...attributes.button,
                          h.Class(
                            'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium',
                          ),
                        ],
                        ['Place Order'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ],
        }),
      ),
    ],
  )
}

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
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
  Match.value(route).pipe(
    Match.tag('Products', () => 'Shopping Cart'),
    Match.orElse(({ _tag }) => `${_tag} | Shopping Cart`),
  )

const view = (model: Model, h: ApplicationViewBuilder) => {
  const routeContent = ApplicationRoute.match(model.route, {
    Products: () => productsView(model),
    Cart: () => cartPageView(model.cart, h),
    Checkout: () =>
      checkoutPageView(
        model.cart,
        model.deliveryInstructions,
        model.orderPlaced,
        h,
      ),
    NotFound: ({ path }) => notFoundView(path, h),
  })

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
