import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { Cart, Item } from '../domain'
import { cartRouter, productsRouter } from '../route'

// MODEL

export const Model = S.Struct({
  products: S.Array(Item.Item),
  searchText: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

const CompletedReplaceUrl = m('CompletedReplaceUrl')
const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })
export const ClickedAddToCart = m('ClickedAddToCart', { item: Item.Item })
export const ClickedChangeQuantity = m('ClickedChangeQuantity', {
  itemId: S.String,
  quantity: S.Number,
})

export const Message = S.Union([
  CompletedReplaceUrl,
  ChangedSearchInput,
  ClickedAddToCart,
  ClickedChangeQuantity,
])
export type Message = typeof Message.Type

// OUT MESSAGE

export const AddedToCart = m('AddedToCart', { item: Item.Item })
export const ChangedQuantity = m('ChangedQuantity', {
  itemId: S.String,
  quantity: S.Number,
})

export const OutMessage = S.Union([AddedToCart, ChangedQuantity])
export type OutMessage = typeof OutMessage.Type

export type AddedToCart = typeof AddedToCart.Type
export type ChangedQuantity = typeof ChangedQuantity.Type

// INIT

export const init = (products: ReadonlyArray<Item.Item>): Model => ({
  products,
  searchText: '',
})

// COMMAND

const ReplaceSearchUrl = Command.define(
  'ReplaceSearchUrl',
  { url: S.String },
  CompletedReplaceUrl,
)(({ url }) => replaceUrl(url).pipe(Effect.as(CompletedReplaceUrl())))

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedReplaceUrl: () => [model, [], Option.none()],

      ChangedSearchInput: ({ value }) => [
        evo(model, { searchText: () => value }),
        [
          ReplaceSearchUrl({
            url: productsRouter({
              searchText: Option.fromNullishOr(value || null),
            }),
          }),
        ],
        Option.none(),
      ],

      ClickedAddToCart: ({ item }) => [
        model,
        [],
        Option.some(AddedToCart({ item })),
      ],

      ClickedChangeQuantity: ({ itemId, quantity }) => [
        model,
        [],
        Option.some(ChangedQuantity({ itemId, quantity })),
      ],
    }),
  )

// VIEW

export type ViewInputs = Readonly<{
  cart: Cart.Cart
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { cart }): Html => {
    const h = html<Message>()

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
                h.input([
                  h.Value(model.searchText),
                  h.Placeholder('Search products...'),
                  h.Class(
                    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                  ),
                  h.OnInput((value: string) => ChangedSearchInput({ value })),
                ]),
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
                      ? h.button(
                          [
                            h.Class(
                              'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium',
                            ),
                            h.OnClick(ClickedAddToCart({ item: product })),
                          ],
                          ['Add to Cart'],
                        )
                      : h.div(
                          [h.Class('flex items-center gap-2')],
                          [
                            h.button(
                              [
                                h.Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                h.OnClick(
                                  ClickedChangeQuantity({
                                    itemId: product.id,
                                    quantity:
                                      Cart.itemQuantity(product.id)(cart) - 1,
                                  }),
                                ),
                              ],
                              ['-'],
                            ),
                            h.span(
                              [
                                h.Class(
                                  'px-3 py-1 font-medium min-w-[2rem] text-center font-mono',
                                ),
                              ],
                              [String(Cart.itemQuantity(product.id)(cart))],
                            ),
                            h.button(
                              [
                                h.Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                h.OnClick(
                                  ClickedChangeQuantity({
                                    itemId: product.id,
                                    quantity:
                                      Cart.itemQuantity(product.id)(cart) + 1,
                                  }),
                                ),
                              ],
                              ['+'],
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
