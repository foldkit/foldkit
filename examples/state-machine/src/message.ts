import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedContinue: {},
  ClickedBack: {},
  ClickedCancel: {},
  ClickedPlaceOrder: {},
  ClickedStartOver: {},
  ToggledPaymentMethod: { isSelected: Schema.Boolean },
  SelectedEdition: { isShippingRequired: Schema.Boolean },
  ToggledTermsAccepted: { isAccepted: Schema.Boolean },
  UpdatedPromoCode: { value: Schema.String },
  SubmittedPromoCode: {},
  CompletedPlaceOrder: { orderId: Schema.String },
})
export type Message = typeof Message.Type
