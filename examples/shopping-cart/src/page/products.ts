import { Array, Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import * as Cart from '../domain/cart'
import * as Item from '../domain/item'
import { cartRouter, productsRouter } from '../route'

const Model = Schema.Struct({
  products: Schema.Array(Item.Item),
  searchText: Schema.String,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedReplaceSearchUrl: {},
  ChangedSearchInput: { value: Schema.String },
  ClickedAddToCart: { item: Item.Item },
  ClickedIncrementQuantity: { itemId: Schema.String },
  ClickedDecrementQuantity: { itemId: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  AddedToCart: { item: Item.Item },
  IncrementedQuantity: { itemId: Schema.String },
  DecrementedQuantity: { itemId: Schema.String },
})

type ViewInput = Readonly<{
  cart: Cart.Cart
}>

export const ReplaceSearchUrl = Command.define('ReplaceSearchUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceSearchUrl],
})

export class Products extends Block<
  Products,
  Readonly<{ products: ReadonlyArray<Item.Item> }>,
  ViewInput
>()('Products', {
  Model,
  Message,
  OutMessage,
  Command: [ReplaceSearchUrl],
}) {}

export const ProductsLive = Products.make(
  Effect.fn(function* (_id, { products }) {
    return {
      model: { products, searchText: '' },

      update: {
        CompletedReplaceSearchUrl: model => ({ model }),

        ChangedSearchInput: (model, { value }) => ({
          model: modifyFields(model, { searchText: () => value }),
          commands: [
            ReplaceSearchUrl({
              url: productsRouter({
                searchText: Option.filter(
                  Option.some(value),
                  value => value !== '',
                ),
              }),
            }),
          ],
        }),

        ClickedAddToCart: (model, { item }) => ({
          model,
          outMessage: OutMessage.AddedToCart({ item }),
        }),

        ClickedIncrementQuantity: (model, { itemId }) => ({
          model,
          outMessage: OutMessage.IncrementedQuantity({ itemId }),
        }),

        ClickedDecrementQuantity: (model, { itemId }) => ({
          model,
          outMessage: OutMessage.DecrementedQuantity({ itemId }),
        }),
      },

      commands: {
        ReplaceSearchUrl: ({ url }) =>
          replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceSearchUrl())),
      },

      view,
    }
  }),
)

const view = (
  model: Model,
  h: HtmlBuilder<Message>,
  { cart }: ViewInput,
): Html => {
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
}
