import { UrlRequest } from 'foldkit/navigation'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import { Cart } from './domain'
import { urlToApplicationRoute } from './route'

export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),
  ClickedLink: (model, { request }) =>
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
  ChangedUrl: makeFieldsStep.fromMessage(({ url }) => ({
    route: () => urlToApplicationRoute(url),
  })),
  ClickedIncrementQuantity: makeFieldsStep.fromMessage(({ itemId }) => ({
    cart: Cart.incrementQuantity(itemId),
  })),
  ClickedDecrementQuantity: makeFieldsStep.fromMessage(({ itemId }) => ({
    cart: Cart.decrementQuantity(itemId),
  })),
  ClickedRemoveCartItem: makeFieldsStep.fromMessage(({ itemId }) => ({
    cart: Cart.removeItem(itemId),
  })),
  ClickedClearCart: makeFieldsStep(() => ({
    cart: () => [],
  })),
  UpdatedDeliveryInstructions: makeFieldsStep.fromMessage(({ value }) => ({
    deliveryInstructions: () => value,
  })),
  ClickedPlaceOrder: makeFieldsStep(() => ({
    orderPlaced: () => true,
    cart: () => [],
    deliveryInstructions: () => '',
  })),
})
