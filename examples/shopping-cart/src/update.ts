import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { Cart } from './domain'
import { Message } from './message'
import { urlToApplicationRoute } from './route'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    ClickedLink: ({ request }) =>
      UrlRequest.match(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),
    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, {
        route: () => urlToApplicationRoute(url),
      }),
    }),
    ClickedIncrementQuantity: ({ itemId }) => ({
      model: modifyFields(model, { cart: Cart.incrementQuantity(itemId) }),
    }),
    ClickedDecrementQuantity: ({ itemId }) => ({
      model: modifyFields(model, { cart: Cart.decrementQuantity(itemId) }),
    }),
    ClickedRemoveCartItem: ({ itemId }) => ({
      model: modifyFields(model, { cart: Cart.removeItem(itemId) }),
    }),
    ClickedClearCart: () => ({
      model: modifyFields(model, { cart: () => [] }),
    }),
    UpdatedDeliveryInstructions: ({ value }) => ({
      model: modifyFields(model, { deliveryInstructions: () => value }),
    }),
    ClickedPlaceOrder: () => ({
      model: modifyFields(model, {
        orderPlaced: () => true,
        cart: () => [],
        deliveryInstructions: () => '',
      }),
    }),
  }),
)
