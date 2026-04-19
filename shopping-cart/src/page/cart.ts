import { Array, Number, Option } from 'effect'
import { Route } from 'foldkit'
import { Html } from 'foldkit/html'

import { Cart } from '../domain'
import {
  Class,
  Href,
  OnClick,
  a,
  article,
  button,
  div,
  h1,
  h3,
  p,
  section,
  span,
} from '../html'
import {
  type CheckoutRoute,
  ClickedCartQuantityChange,
  ClickedClearCart,
  ClickedRemoveCartItem,
  type ProductsRoute,
} from '../main'

// VIEW

export const view = (
  cart: Cart.Cart,
  productsRouter: Route.Router<ProductsRoute>,
  checkoutRouter: Route.Router<CheckoutRoute>,
): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-8')], ['Shopping Cart']),
      div(
        [Class('bg-white rounded-lg shadow p-6')],
        [
          div(
            [],
            Array.match(cart, {
              onEmpty: () => [
                p(
                  [Class('text-gray-500 text-center py-8')],
                  ['Your cart is empty'],
                ),
                div(
                  [Class('text-center mt-4')],
                  [
                    a(
                      [
                        Href(productsRouter({ searchText: Option.none() })),
                        Class(
                          'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
                        ),
                      ],
                      ['Continue Shopping'],
                    ),
                  ],
                ),
              ],
              onNonEmpty: cart => [
                section(
                  [Class('space-y-4 mb-6')],
                  cart.map(cartItem =>
                    article(
                      [
                        Class(
                          'flex items-center justify-between p-4 border rounded-lg',
                        ),
                      ],
                      [
                        div(
                          [],
                          [
                            h3(
                              [Class('font-semibold text-gray-800')],
                              [cartItem.item.name],
                            ),
                            p(
                              [Class('text-gray-600')],
                              [`$${cartItem.item.price.toFixed(2)} each`],
                            ),
                          ],
                        ),
                        div(
                          [Class('flex items-center gap-2')],
                          [
                            button(
                              [
                                Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                OnClick(
                                  ClickedCartQuantityChange({
                                    itemId: cartItem.item.id,
                                    quantity: Number.decrement(
                                      cartItem.quantity,
                                    ),
                                  }),
                                ),
                              ],
                              ['-'],
                            ),
                            span(
                              [Class('px-3 py-1 font-medium')],
                              [String(cartItem.quantity)],
                            ),
                            button(
                              [
                                Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                OnClick(
                                  ClickedCartQuantityChange({
                                    itemId: cartItem.item.id,
                                    quantity: cartItem.quantity + 1,
                                  }),
                                ),
                              ],
                              ['+'],
                            ),
                            button(
                              [
                                Class(
                                  'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2',
                                ),
                                OnClick(
                                  ClickedRemoveCartItem({
                                    itemId: cartItem.item.id,
                                  }),
                                ),
                              ],
                              ['Remove'],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                div(
                  [Class('border-t pt-4 mb-6')],
                  [
                    div(
                      [Class('flex justify-between items-center')],
                      [
                        h3(
                          [Class('text-xl font-bold text-gray-800')],
                          ['Total'],
                        ),
                        p(
                          [Class('text-xl font-bold text-gray-800')],
                          [
                            `$${cart.reduce((total, item) => total + item.item.price * item.quantity, 0).toFixed(2)}`,
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                div(
                  [Class('flex gap-4 justify-center')],
                  [
                    a(
                      [
                        Href(productsRouter({ searchText: Option.none() })),
                        Class(
                          'bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                      ],
                      ['Continue Shopping'],
                    ),
                    button(
                      [
                        Class(
                          'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                        OnClick(ClickedClearCart()),
                      ],
                      ['Clear Cart'],
                    ),
                    a(
                      [
                        Href(checkoutRouter()),
                        Class(
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
