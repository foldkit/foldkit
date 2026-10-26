import { Effect, Option, Schema } from 'effect'
import { replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { Item } from '../../domain'
import { productsRouter } from '../../route'
import { ProductsComposition } from './composition'
import {
  Message,
  Model,
  OutMessage,
  ProductsDefinition,
  makeNoopStep,
  makeOutMessageStep,
} from './definition'

export const init = ProductsComposition.makeInit(
  (products: ReadonlyArray<typeof Item.Item.Type>) => ({
    model: Model.make({ products, searchText: '' }),
  }),
)

export const ReplaceSearchUrl = ProductsDefinition.makeCommand(
  'ReplaceSearchUrl',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedReplaceSearchUrl],
    handler: function* () {
      return ({ url }) =>
        replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceSearchUrl()))
    },
  },
)

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
