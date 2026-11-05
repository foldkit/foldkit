import { Effect, Option, Schema } from 'effect'
import { replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { Item } from '../../domain'
import { productsRouter } from '../../route'
import {
  Message,
  Model,
  OutMessage,
  makeCommand,
  makeNoopStep,
  makeOutMessageStep,
} from './block'
import { ProductsComposition } from './composition'

export const init = ProductsComposition.makeInit(
  (products: ReadonlyArray<Item.Item>) => ({
    model: Model.make({ products, searchText: '' }),
  }),
)

export const ReplaceSearchUrl = makeCommand('ReplaceSearchUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceSearchUrl],
  handler: function* () {
    return ({ url }) =>
      replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceSearchUrl()))
  },
})

export const update = ProductsComposition.makeUpdate({
  CompletedReplaceSearchUrl: makeNoopStep(),

  ChangedSearchInput: (model, { value }) => ({
    model: modifyFields(model, { searchText: () => value }),
    commands: [
      ReplaceSearchUrl({
        url: productsRouter({
          searchText: Option.filter(Option.some(value), value => value !== ''),
        }),
      }),
    ],
  }),

  ClickedAddToCart: makeOutMessageStep.fromMessage(({ item }) =>
    OutMessage.AddedToCart({ item }),
  ),

  ClickedIncrementQuantity: makeOutMessageStep.fromMessage(({ itemId }) =>
    OutMessage.IncrementedQuantity({ itemId }),
  ),

  ClickedDecrementQuantity: makeOutMessageStep.fromMessage(({ itemId }) =>
    OutMessage.DecrementedQuantity({ itemId }),
  ),
})
