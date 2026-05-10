import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { ExtractTag } from 'effect/Types'
import { Command, Route } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { Cart, Item } from '../domain'
import type { AppRoute, CartRoute } from '../main'

// MODEL

export const Model = S.Struct({
  products: S.Array(Item.Item),
  searchText: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

const CompletedReplaceUrl = m('CompletedReplaceUrl')
const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })

export const Message = S.Union([CompletedReplaceUrl, ChangedSearchInput])
export type Message = typeof Message.Type

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

export const update =
  (productsRouter: Route.Router<ExtractTag<AppRoute, 'Products'>>) =>
  (
    model: Model,
    message: Message,
  ): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
    M.value(message).pipe(
      M.withReturnType<
        readonly [Model, ReadonlyArray<Command.Command<Message>>]
      >(),
      M.tagsExhaustive({
        CompletedReplaceUrl: () => [model, []],

        ChangedSearchInput: ({ value }) => [
          evo(model, {
            searchText: () => value,
          }),
          [
            ReplaceSearchUrl({
              url: productsRouter({
                searchText: Option.fromNullishOr(value || null),
              }),
            }),
          ],
        ],
      }),
    )

// VIEW

export const view = <ParentMessage>(
  model: Model,
  cart: Cart.Cart,
  cartRouter: Route.Router<CartRoute>,
  toParentMessage: (message: Message) => ParentMessage,
  onAddToCart: (item: Item.Item) => ParentMessage,
  onQuantityChange: (itemId: string, quantity: number) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

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
                h.OnInput((value: string) =>
                  toParentMessage(ChangedSearchInput({ value })),
                ),
              ]),
            ],
          ),
          h.section(
            [h.Class('grid gap-4')],
            filteredProducts.map(product =>
              h.article(
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
                          h.OnClick(onAddToCart(product)),
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
                                onQuantityChange(
                                  product.id,
                                  Cart.itemQuantity(product.id)(cart) - 1,
                                ),
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
                                onQuantityChange(
                                  product.id,
                                  Cart.itemQuantity(product.id)(cart) + 1,
                                ),
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
}
