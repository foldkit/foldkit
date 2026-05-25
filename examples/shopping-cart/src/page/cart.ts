import { Array, Number, Option } from 'effect'
import { Html, html } from 'foldkit/html'

import { Cart } from '../domain'
import {
  ClickedClearCart,
  ClickedQuantityChange,
  ClickedRemoveCartItem,
  Message,
} from '../main'
import { checkoutRouter, productsRouter } from '../route'

// VIEW

export const view = (cart: Cart.Cart): Html => {
  const h = html<Message>()

  return h.div(
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
                            h.button(
                              [
                                h.Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                h.OnClick(
                                  ClickedQuantityChange({
                                    itemId: cartItem.item.id,
                                    quantity: Number.decrement(
                                      cartItem.quantity,
                                    ),
                                  }),
                                ),
                              ],
                              ['-'],
                            ),
                            h.span(
                              [h.Class('px-3 py-1 font-medium')],
                              [String(cartItem.quantity)],
                            ),
                            h.button(
                              [
                                h.Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                h.OnClick(
                                  ClickedQuantityChange({
                                    itemId: cartItem.item.id,
                                    quantity: cartItem.quantity + 1,
                                  }),
                                ),
                              ],
                              ['+'],
                            ),
                            h.button(
                              [
                                h.Class(
                                  'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2',
                                ),
                                h.OnClick(
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
                    h.button(
                      [
                        h.Class(
                          'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                        h.OnClick(ClickedClearCart()),
                      ],
                      ['Clear Cart'],
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
}
