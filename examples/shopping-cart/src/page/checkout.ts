import { Array, Option } from 'effect'
import { Html, html } from 'foldkit/html'

import { Cart } from '../domain'
import {
  ClickedPlaceOrder,
  Message,
  UpdatedDeliveryInstructions,
} from '../main'
import { cartRouter, productsRouter } from '../route'

// VIEW

export const view = (
  cart: Cart.Cart,
  deliveryInstructions: string,
  orderPlaced: boolean,
): Html => {
  const h = html<Message>()

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
            h.div(
              [h.Class('mb-6')],
              [
                h.h3(
                  [h.Class('text-lg font-semibold text-gray-800 mb-2')],
                  ['Delivery Instructions'],
                ),
                h.textarea(
                  [
                    h.Value(deliveryInstructions),
                    h.Placeholder(
                      'Special delivery instructions (optional)...',
                    ),
                    h.Class(
                      'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none',
                    ),
                    h.OnInput((value: string) =>
                      UpdatedDeliveryInstructions({ value }),
                    ),
                  ],
                  [],
                ),
              ],
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
                h.button(
                  [
                    h.Class(
                      'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium',
                    ),
                    h.OnClick(ClickedPlaceOrder()),
                  ],
                  ['Place Order'],
                ),
              ],
            ),
          ],
        }),
      ),
    ],
  )
}
