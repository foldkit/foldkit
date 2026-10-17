import { Effect, Option, Schema } from 'effect'
import { replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { Item } from '../../domain'
import { productsRouter } from '../../route'
import {
  Message,
  Model,
  OutMessage,
  Products,
  ProductsComposition,
} from './definition'

export const init = ProductsComposition.makeInit(
  (products: ReadonlyArray<Item.Item>) => ({
    model: Model.make({ products, searchText: '' }),
  }),
)

export const ReplaceSearchUrl = Products.command('ReplaceSearchUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceSearchUrl],
  handler: function* () {
    return ({ url }) =>
      replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceSearchUrl()))
  },
})

export const update = ProductsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    CompletedReplaceSearchUrl: () => ({ model }),

    ChangedSearchInput: ({ value }) => ({
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

    ClickedAddToCart: ({ item }) => ({
      model,
      outMessage: OutMessage.AddedToCart({ item }),
    }),

    ClickedIncrementQuantity: ({ itemId }) => ({
      model,
      outMessage: OutMessage.IncrementedQuantity({ itemId }),
    }),

    ClickedDecrementQuantity: ({ itemId }) => ({
      model,
      outMessage: OutMessage.DecrementedQuantity({ itemId }),
    }),
  }),
)
