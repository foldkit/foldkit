import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { ExtractTag } from 'effect/Types'
import { Command, Route } from 'foldkit'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { Cart, Item } from '../domain'
import {
  Class,
  Href,
  OnClick,
  OnInput,
  Placeholder,
  Value,
  a,
  article,
  button,
  div,
  empty,
  h1,
  h3,
  input,
  p,
  search,
  section,
  span,
} from '../html'
import type { AppRoute, CartRoute, Message as ParentMessage } from '../main'

// MODEL

export const Model = S.Struct({
  products: S.Array(Item.Item),
  searchText: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

const CompletedUrlReplace = m('CompletedUrlReplace')
const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })

export const Message = S.Union(CompletedUrlReplace, ChangedSearchInput)
export type Message = typeof Message.Type

// INIT

export const init = (products: ReadonlyArray<Item.Item>): Model => ({
  products,
  searchText: '',
})

// UPDATE

export const update =
  (productsRouter: Route.Router<ExtractTag<AppRoute, 'Products'>>) =>
  (
    model: Model,
    message: Message,
  ): [Model, ReadonlyArray<Command.Command<Message>>] =>
    M.value(message).pipe(
      M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
      M.tagsExhaustive({
        CompletedUrlReplace: () => [model, []],

        ChangedSearchInput: ({ value }) => [
          evo(model, {
            searchText: () => value,
          }),
          [
            replaceUrl(
              productsRouter({
                searchText: Option.fromNullable(value || null),
              }),
            ).pipe(
              Effect.as(CompletedUrlReplace()),
              Command.make('ReplaceSearchUrl'),
            ),
          ],
        ],
      }),
    )

// VIEW

export const view = (
  model: Model,
  cart: Cart.Cart,
  cartRouter: Route.Router<CartRoute>,
  toMessage: (message: Message) => ParentMessage,
  onAddToCart: (item: Item.Item) => ParentMessage,
  onQuantityChange: (itemId: string, quantity: number) => ParentMessage,
): Html => {
  const filteredProducts = model.searchText
    ? model.products.filter(product =>
        product.name.toLowerCase().includes(model.searchText.toLowerCase()),
      )
    : model.products

  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-8')], ['Products']),
      div(
        [Class('bg-white rounded-lg shadow p-6')],
        [
          search(
            [Class('mb-6')],
            [
              input([
                Value(model.searchText),
                Placeholder('Search products...'),
                Class(
                  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                ),
                OnInput((value: string) =>
                  toMessage(ChangedSearchInput({ value })),
                ),
              ]),
            ],
          ),
          section(
            [Class('grid gap-4')],
            filteredProducts.map(product =>
              article(
                [
                  Class(
                    'flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50',
                  ),
                ],
                [
                  div(
                    [],
                    [
                      h3(
                        [Class('font-semibold text-gray-800')],
                        [product.name],
                      ),
                      p(
                        [Class('text-gray-600')],
                        [`$${product.price.toFixed(2)}`],
                      ),
                    ],
                  ),
                  Cart.itemQuantity(product.id)(cart) === 0
                    ? button(
                        [
                          Class(
                            'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium',
                          ),
                          OnClick(onAddToCart(product)),
                        ],
                        ['Add to Cart'],
                      )
                    : div(
                        [Class('flex items-center gap-2')],
                        [
                          button(
                            [
                              Class(
                                'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                              ),
                              OnClick(
                                onQuantityChange(
                                  product.id,
                                  Cart.itemQuantity(product.id)(cart) - 1,
                                ),
                              ),
                            ],
                            ['-'],
                          ),
                          span(
                            [
                              Class(
                                'px-3 py-1 font-medium min-w-[2rem] text-center font-mono',
                              ),
                            ],
                            [String(Cart.itemQuantity(product.id)(cart))],
                          ),
                          button(
                            [
                              Class(
                                'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                              ),
                              OnClick(
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
            onEmpty: () => empty,
            onNonEmpty: cart =>
              div(
                [Class('mt-6 text-center')],
                [
                  a(
                    [
                      Href(cartRouter()),
                      Class(
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
