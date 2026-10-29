import { Array } from 'effect'

import { Button, Input } from '@foldkit/ui'

import { Cart } from '../../domain'
import { cartRouter } from '../../route'
import { ProductsComposition } from './composition'
import { Message } from './definition'

export type ViewInputs = Readonly<{
  cart: Cart.Cart
}>

export const view = ProductsComposition.makeView.withInputs<ViewInputs>(
  (model, { cart }, h) => {
    const filteredProducts = model.searchText
      ? model.products.filter(product =>
          product.name.toLowerCase().includes(model.searchText.toLowerCase()),
        )
      : model.products

    return h.div(
      [h.Class('max-w-4xl mx-auto px-4')],
      [
        h.h1([h.Class('text-4xl font-bold text-gray-800 mb-8')], ['Products']),
        h.div(
          [h.Class('bg-white rounded-lg shadow p-6')],
          [
            h.search(
              [h.Class('mb-6')],
              [
                Input.view(
                  {
                    id: 'product-search',
                    value: model.searchText,
                    placeholder: 'Search products...',
                    onInput: value => Message.ChangedSearchInput({ value }),
                    toView: attributes =>
                      h.input([
                        ...attributes.input,
                        h.AriaLabel('Search products'),
                        h.Class(
                          'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                        ),
                      ]),
                  },
                  h,
                ),
              ],
            ),
            h.section(
              [h.Class('grid gap-4')],
              filteredProducts.map(product =>
                h.keyed('article')(
                  product.id,
                  [
                    h.Class(
                      'flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50',
                    ),
                  ],
                  [
                    h.div(
                      [],
                      [
                        h.h3(
                          [h.Class('font-semibold text-gray-800')],
                          [product.name],
                        ),
                        h.p(
                          [h.Class('text-gray-600')],
                          [`$${product.price.toFixed(2)}`],
                        ),
                      ],
                    ),
                    Cart.itemQuantity(product.id)(cart) === 0
                      ? Button.view(
                          {
                            onClick: Message.ClickedAddToCart({
                              item: product,
                            }),
                            toView: attributes =>
                              h.button(
                                [
                                  ...attributes.button,
                                  h.Class(
                                    'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium',
                                  ),
                                ],
                                ['Add to Cart'],
                              ),
                          },
                          h,
                        )
                      : h.div(
                          [h.Class('flex items-center gap-2')],
                          [
                            Button.view(
                              {
                                onClick: Message.ClickedDecrementQuantity({
                                  itemId: product.id,
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
                              [
                                h.Class(
                                  'px-3 py-1 font-medium min-w-[2rem] text-center font-mono',
                                ),
                              ],
                              [String(Cart.itemQuantity(product.id)(cart))],
                            ),
                            Button.view(
                              {
                                onClick: Message.ClickedIncrementQuantity({
                                  itemId: product.id,
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
                          ],
                        ),
                  ],
                ),
              ),
            ),
            Array.match(cart, {
              onEmpty: () => h.empty,
              onNonEmpty: cart =>
                h.div(
                  [h.Class('mt-6 text-center')],
                  [
                    h.a(
                      [
                        h.Href(cartRouter()),
                        h.Class(
                          'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
                        ),
                      ],
                      [`Go to Cart (${Cart.totalItems(cart)})`],
                    ),
                  ],
                ),
            }),
          ],
        ),
      ],
    )
  },
)
