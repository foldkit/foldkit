import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import * as Products from './page/products/definition'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  GotProductsMessage: { message: Products.Message },
  ClickedIncrementQuantity: { itemId: Schema.String },
  ClickedDecrementQuantity: { itemId: Schema.String },
  ClickedRemoveCartItem: { itemId: Schema.String },
  ClickedClearCart: {},
  UpdatedDeliveryInstructions: { value: Schema.String },
  ClickedPlaceOrder: {},
})

export type Message = typeof Message.Type
