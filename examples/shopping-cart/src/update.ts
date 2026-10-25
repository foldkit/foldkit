import { UrlRequest } from 'foldkit/navigation'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { Cart } from './domain'
import { urlToApplicationRoute } from './route'

export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadExternal: ApplicationDefinition.makeNoopStep(),
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
  ChangedUrl: ApplicationDefinition.makeFieldsStep.fromMessage(({ url }) => ({
    route: () => urlToApplicationRoute(url),
  })),
  ClickedIncrementQuantity: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ itemId }) => ({ cart: Cart.incrementQuantity(itemId) }),
  ),
  ClickedDecrementQuantity: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ itemId }) => ({ cart: Cart.decrementQuantity(itemId) }),
  ),
  ClickedRemoveCartItem: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ itemId }) => ({ cart: Cart.removeItem(itemId) }),
  ),
  ClickedClearCart: ApplicationDefinition.makeFieldsStep(() => ({
    cart: () => [],
  })),
  UpdatedDeliveryInstructions: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ deliveryInstructions: () => value }),
  ),
  ClickedPlaceOrder: ApplicationDefinition.makeFieldsStep(() => ({
    orderPlaced: () => true,
    cart: () => [],
    deliveryInstructions: () => '',
  })),
})
